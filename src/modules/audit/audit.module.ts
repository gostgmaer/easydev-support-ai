import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { AuditEventPublisher } from './audit-event.publisher';

@Global()
@Module({
  providers: [AuditService, AuditRepository, AuditEventPublisher],
  exports: [AuditService, AuditRepository, AuditEventPublisher],
})
export class AuditModule {}
