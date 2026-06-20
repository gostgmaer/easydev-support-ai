import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<Map<string, string>>();

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) || uuidv4();
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const tenantId = (req.headers['x-tenant-id'] as string) || 'system';
    const userId = (req.headers['x-user-id'] as string) || '';
    const workflowId = (req.headers['x-workflow-id'] as string) || '';
    const conversationId = (req.headers['x-conversation-id'] as string) || '';
    const messageId = (req.headers['x-message-id'] as string) || '';

    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-tenant-id', tenantId);

    const store = new Map<string, string>([
      ['correlationId', correlationId],
      ['requestId', requestId],
      ['traceId', traceId],
      ['tenantId', tenantId],
      ['userId', userId],
      ['workflowId', workflowId],
      ['conversationId', conversationId],
      ['messageId', messageId],
    ]);

    traceStorage.run(store, () => {
      next();
    });
  }
}
