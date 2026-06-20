import { Logger } from '@nestjs/common';

export interface TraceContext {
  tenantId?: string;
  correlationId?: string;
  requestId?: string;
  workflowId?: string;
  conversationId?: string;
  messageId?: string;
}

export class OpenTelemetrySetup {
  private static readonly logger = new Logger('OpenTelemetrySetup');
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    if (process.env.ENABLE_OTEL === 'true') {
      try {
        const { NodeSDK } = require('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
        const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

        const traceExporter = new OTLPTraceExporter({
          url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
        });

        const sdk = new NodeSDK({
          traceExporter,
          instrumentations: [
            getNodeAutoInstrumentations({
              '@opentelemetry/instrumentation-http': {
                requestHook: (span: any, request: any) => {
                  // Propagate custom context headers to OTEL span attributes
                  const headers = request.headers || {};
                  if (headers['x-tenant-id']) span.setAttribute('tenant_id', headers['x-tenant-id']);
                  if (headers['x-correlation-id']) span.setAttribute('correlation_id', headers['x-correlation-id']);
                  if (headers['x-request-id']) span.setAttribute('request_id', headers['x-request-id']);
                },
              },
            }),
          ],
        });

        sdk.start();
        this.isInitialized = true;
        this.logger.log('OpenTelemetry SDK bootstrapped successfully with OTLP Exporter.');
      } catch (err: any) {
        this.logger.warn(`OTel auto-instrumentation packages not found. Running tracing fallback: ${err.message}`);
      }
    }
  }

  // Create an explicit span simulation utility for metrics/tracing integration when standard OTEL is bypassed or simulated
  public static startActiveSpan<T>(
    name: string,
    context: TraceContext,
    callback: (span: { setAttribute: (k: string, v: any) => void; end: () => void }) => Promise<T>
  ): Promise<T> {
    const attributes = new Map<string, any>(Object.entries(context));
    const span = {
      setAttribute: (k: string, v: any) => {
        attributes.set(k, v);
      },
      end: () => {
        // Simulates span finishing
      },
    };
    return callback(span);
  }
}
