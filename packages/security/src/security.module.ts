import { Module } from '@nestjs/common';
import { TenantIsolationService } from './tenant-isolation.service';
import { PermissionGuard } from './permission.guard';
import { EncryptionService } from './encryption.service';
import { ApiSecurityService } from './api-security.service';
import { PiiProtectionService } from './pii-protection.service';
import { WebhookSecurityService } from './webhook-security.service';
import { FileSecurityService } from './file-security.service';
import { AiSecurityService } from './ai-security.service';
import { AuditService } from './audit.service';
import { SessionSecurityService } from './session-security.service';
import { SecurityEventPublisher } from './security-event.publisher';
import { SecurityQueueProcessor } from './queue-jobs';

@Module({
  providers: [
    TenantIsolationService,
    PermissionGuard,
    EncryptionService,
    ApiSecurityService,
    PiiProtectionService,
    WebhookSecurityService,
    FileSecurityService,
    AiSecurityService,
    AuditService,
    SessionSecurityService,
    SecurityEventPublisher,
    SecurityQueueProcessor,
  ],
  exports: [
    TenantIsolationService,
    PermissionGuard,
    EncryptionService,
    ApiSecurityService,
    PiiProtectionService,
    WebhookSecurityService,
    FileSecurityService,
    AiSecurityService,
    AuditService,
    SessionSecurityService,
    SecurityEventPublisher,
    SecurityQueueProcessor,
  ],
})
export class SecurityModule {}
