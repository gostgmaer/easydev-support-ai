import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { MetricsService } from './metrics.service';

export const traceStorage = new AsyncLocalStorage<Map<string, string>>();

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = process.hrtime.bigint();
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

    // Route pattern (e.g. "/v1/tickets/:id"), not the raw path - using the raw
    // path would give every distinct ticket/customer/etc ID its own
    // Prometheus time series (unbounded cardinality).
    res.on('finish', () => {
      const routeLabel = req.route
        ? `${req.baseUrl}${req.route.path}`
        : 'unmatched';
      const durationSeconds =
        Number(process.hrtime.bigint() - startTime) / 1e9;
      this.metricsService.recordHttpRequest(
        tenantId,
        req.method,
        routeLabel,
        String(res.statusCode),
        durationSeconds,
      );
    });

    traceStorage.run(store, () => {
      next();
    });
  }
}
