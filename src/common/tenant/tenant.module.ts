import { Global, Module } from '@nestjs/common';
import { TenantResolver } from '@easydev/shared-kernel';

@Global()
@Module({
  providers: [TenantResolver],
  exports: [TenantResolver],
})
export class TenantModule {}
