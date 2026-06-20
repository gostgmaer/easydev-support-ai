import { Injectable } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import { AuditEventPublisher } from './audit-event.publisher';

@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly publisher: AuditEventPublisher,
  ) {}

  async log(log: {
    tenantId: string;
    userId?: string;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdBy?: string;
    updatedBy?: string;
  }): Promise<void> {
    await this.auditRepository.save(log);
    await this.publisher.publish(log);
  }
}
