import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TenantResolver {
  resolve(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    if (!request) return undefined;

    let tenantId = request.headers['x-tenant-id'] || request.headers['x-tenant-slug'];
    if (tenantId) return String(tenantId);

    const user = request.user;
    if (user && user.tenantId) {
      return user.tenantId;
    }

    tenantId = request.query?.tenantId || request.query?.tenant_id;
    if (tenantId) return String(tenantId);

    return undefined;
  }
}
