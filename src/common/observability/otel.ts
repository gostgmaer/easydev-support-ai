import { OpenTelemetrySetup } from '@easydev/observability';

export function initializeOtel() {
  OpenTelemetrySetup.initialize();
}
