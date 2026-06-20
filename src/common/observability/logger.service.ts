import { Injectable } from '@nestjs/common';
import { LokiLogger } from '@easydev/observability';
import { traceStorage } from './observability.middleware';

@Injectable()
export class StructuredLogger extends LokiLogger {
  log(message: any, context?: string) {
    const store = traceStorage.getStore();
    const traceId = store?.get('traceId');
    const requestId = store?.get('requestId');

    const entry = {
      level: 'info',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      tenantId: store?.get('tenantId') || 'system',
      requestId,
      traceId,
      userId: store?.get('userId'),
      workflowId: store?.get('workflowId'),
      conversationId: store?.get('conversationId'),
      messageId: store?.get('messageId'),
      context,
      payload: typeof message === 'object' ? message : undefined,
    };

    this.shipLog(entry).catch(() => {});
  }

  error(message: any, stack?: string, context?: string) {
    const store = traceStorage.getStore();
    const traceId = store?.get('traceId');
    const requestId = store?.get('requestId');

    const entry = {
      level: 'error',
      message: typeof message === 'string' ? message : JSON.stringify(message),
      tenantId: store?.get('tenantId') || 'system',
      requestId,
      traceId,
      userId: store?.get('userId'),
      workflowId: store?.get('workflowId'),
      conversationId: store?.get('conversationId'),
      messageId: store?.get('messageId'),
      context,
      payload: { stack, ...(typeof message === 'object' ? message : {}) },
    };

    this.shipLog(entry).catch(() => {});
  }
}
