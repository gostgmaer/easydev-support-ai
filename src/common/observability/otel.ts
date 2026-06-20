export function initializeOtel() {
  if (process.env.ENABLE_OTEL === 'true') {
    try {
      const { NodeSDK } = require('@opentelemetry/sdk-node');
      const {
        getNodeAutoInstrumentations,
      } = require('@opentelemetry/auto-instrumentations-node');

      const sdk = new NodeSDK({
        instrumentations: [getNodeAutoInstrumentations()],
      });
      sdk.start();
      console.log('OpenTelemetry initialised successfully.');
    } catch (e: any) {
      console.warn(
        'OpenTelemetry packages not found, tracing disabled.',
        e.message,
      );
    }
  }
}
