import { CanActivate, ExecutionContext } from '@nestjs/common';
import { TenantResolver } from './tenant-resolver';
export declare class TenantGuard implements CanActivate {
    private readonly tenantResolver;
    constructor(tenantResolver: TenantResolver);
    canActivate(context: ExecutionContext): boolean;
}
