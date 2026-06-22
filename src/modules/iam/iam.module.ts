import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamRegistrationService } from './iam-registration.service';
import { IamGatewayService } from './iam-gateway.service';
import { IamProxyController } from './controllers/iam-proxy.controller';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [IamProxyController],
  providers: [IamRegistrationService, IamGatewayService],
  exports: [IamRegistrationService],
})
export class IamModule {}
