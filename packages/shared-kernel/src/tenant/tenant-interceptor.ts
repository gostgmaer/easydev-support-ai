import { CallHandler, ExecutionContext, NestInterceptor, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantResolver } from './tenant-resolver';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantResolver: TenantResolver) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const tenantId = this.tenantResolver.resolve(context);
    if (tenantId) {
      return new Observable((subscriber) => {
        TenantContext.run(tenantId, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }
    return next.handle();
  }
}
