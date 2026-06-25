import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantResolver } from './tenant-resolver';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly tenantResolver: TenantResolver) {}

  canActivate(context: ExecutionContext): boolean {
    const tenantId = this.tenantResolver.resolve(context);
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID (x-tenant-id) is required');
    }

    const request = context.switchToHttp().getRequest();
    request.tenantId = tenantId;

    return true;
  }
}
