import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { AuditService } from './audit.service';
import { TenantContext } from '@easydev/shared-kernel';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = TenantContext.getTenantId() || request.tenantId || request.headers['x-tenant-id'];
    const user = request.user;
    const userId = user?.id || user?.userId;
    const ipAddress = request.ip || request.connection.remoteAddress;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap(async () => {
        if (tenantId) {
          await this.auditService.log({
            tenantId,
            userId,
            action,
            details: `Successfully completed ${action} request on path ${request.url}`,
            ipAddress,
            userAgent,
            createdBy: userId,
          });
        }
      })
    );
  }
}
