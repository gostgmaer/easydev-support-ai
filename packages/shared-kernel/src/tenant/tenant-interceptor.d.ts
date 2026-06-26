import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantResolver } from './tenant-resolver';
export declare class TenantInterceptor implements NestInterceptor {
  private readonly tenantResolver;
  constructor(tenantResolver: TenantResolver);
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
