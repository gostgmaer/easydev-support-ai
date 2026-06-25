import { Injectable, ConsoleLogger, Logger } from '@nestjs/common';
import axios from 'axios';

export interface LokiLogEntry {
  level: string;
  message: string;
  tenantId: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  workflowId?: string;
  conversationId?: string;
  messageId?: string;
  context?: string;
  payload?: any;
}

@Injectable()
export class LokiLogger extends ConsoleLogger {
  private readonly logger = new Logger('LokiLogger');
  private readonly lokiUrl: string | undefined;

  constructor() {
    super();
    this.lokiUrl = process.env.LOKI_URL; // e.g. http://localhost:3100/loki/api/v1/push
  }

  // Encryption/masking helper logic
  private maskSensitiveData(message: string): string {
    // Basic regex pattern masking for common secrets and keys
    return message
      .replace(/[\w\.-]+@[\w\.-]+\.\w{2,4}/g, '***@***.***') // email mask
      .replace(
        /"?(?:password|token|apikey|secret|key)"?\s*[:=]\s*["']?[a-zA-Z0-9_-]+["']?/gi,
        (match) => {
          const parts = match.split(/[:=]/);
          return `${parts[0]}:"[REDACTED]"`;
        },
      );
  }

  async shipLog(entry: LokiLogEntry) {
    const timestampNs = (Date.now() * 1000000).toString();
    const maskedMessage = this.maskSensitiveData(entry.message);

    const logString = JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'easydev-support-ai',
      tenant_id: entry.tenantId,
      request_id: entry.requestId,
      trace_id: entry.traceId,
      user_id: entry.userId,
      workflow_id: entry.workflowId,
      conversation_id: entry.conversationId,
      message_id: entry.messageId,
      level: entry.level,
      event: entry.context || 'general',
      payload: entry.payload
        ? JSON.parse(this.maskSensitiveData(JSON.stringify(entry.payload)))
        : undefined,
      message: maskedMessage,
    });

    // Write to stdOut in structured JSON format for Docker/Loki collectors to ingest
    if (entry.level === 'error') {
      super.error(logString);
    } else {
      super.log(logString);
    }

    // Direct HTTP Log Shipping to Grafana Loki if configured
    if (this.lokiUrl) {
      try {
        const payload = {
          streams: [
            {
              stream: {
                service: 'easydev-support-ai',
                tenant: entry.tenantId,
                level: entry.level,
              },
              values: [[timestampNs, logString]],
            },
          ],
        };
        await axios.post(this.lokiUrl, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 1000,
        });
      } catch (err: any) {
        // Fail silently to avoid breaking execution
        this.logger.warn(`Failed to ship logs to Grafana Loki: ${err.message}`);
      }
    }
  }
}
