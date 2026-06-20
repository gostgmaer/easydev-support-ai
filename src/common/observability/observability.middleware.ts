import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<Map<string, string>>();

@Injectable()
export class ObservabilityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();

    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-trace-id', traceId);

    const store = new Map<string, string>([
      ['correlationId', correlationId],
      ['requestId', requestId],
      ['traceId', traceId]
    ]);

    traceStorage.run(store, () => {
      next();
    });
  }
}
