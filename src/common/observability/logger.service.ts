import { ConsoleLogger, Injectable } from '@nestjs/common';
import { traceStorage } from './observability.middleware';

@Injectable()
export class StructuredLogger extends ConsoleLogger {
  log(message: any, context?: string) {
    const store = traceStorage.getStore();
    const traceData = store
      ? {
          correlationId: store.get('correlationId'),
          requestId: store.get('requestId'),
          traceId: store.get('traceId')
        }
      : {};

    const logEntry = {
      level: 'info',
      timestamp: new Date().toISOString(),
      context,
      message,
      ...traceData
    };

    if (process.env.NODE_ENV === 'production') {
      super.log(JSON.stringify(logEntry));
    } else {
      const traceString = store ? ` [TraceID: ${store.get('traceId')}]` : '';
      super.log(`${message}${traceString}`, context);
    }
  }

  error(message: any, stack?: string, context?: string) {
    const store = traceStorage.getStore();
    const traceData = store
      ? {
          correlationId: store.get('correlationId'),
          requestId: store.get('requestId'),
          traceId: store.get('traceId')
        }
      : {};

    const logEntry = {
      level: 'error',
      timestamp: new Date().toISOString(),
      context,
      message,
      stack,
      ...traceData
    };

    if (process.env.NODE_ENV === 'production') {
      super.error(JSON.stringify(logEntry));
    } else {
      super.error(message, stack, context);
    }
  }
}
