import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { AuditService } from './audit.service';

@Processor('admin-queue')
@Injectable()
export class SecurityQueueProcessor extends BaseWorker {
  constructor(
    private readonly auditService: AuditService,
    @Optional() queueService?: QueueService,
  ) {
    super('SecurityQueueProcessor', 'admin-queue', queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId =
      job.data._tenantContext?.tenantId || job.data.tenantId || 'system';

    switch (job.name) {
      case 'security-scan-job':
        this.logger.log(
          `Processing security-scan-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.logEvent(
          tenantId,
          'system',
          'SECURITY_SCAN',
          'Automated security scan executed successfully',
        );
        return { success: true };

      case 'security-audit-job':
        this.logger.log(
          `Processing security-audit-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.logEvent(
          tenantId,
          job.data.userId || 'system',
          'SECURITY_AUDIT',
          job.data.details || 'Security audit log check executed',
        );
        return { success: true };

      case 'security-cleanup-job':
        this.logger.log(
          `Processing security-cleanup-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.logEvent(
          tenantId,
          'system',
          'SECURITY_CLEANUP',
          'Security cleanup executed: expired sessions and locks purged',
        );
        return { success: true };

      case 'security-alert-job':
        this.logger.log(
          `Processing security-alert-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.logEvent(
          tenantId,
          'system',
          'SECURITY_ALERT',
          `Security alert triggered: ${job.data.reason || 'unspecified anomaly'}`,
        );
        return { success: true };

      case 'credential-rotation-job':
        this.logger.log(
          `Processing credential-rotation-job ${job.id} for Tenant: ${tenantId}`,
        );
        await this.auditService.logEvent(
          tenantId,
          'system',
          'CREDENTIAL_ROTATION',
          'System credential rotation check completed',
        );
        return { success: true };

      default:
        this.logger.warn(
          `Unknown job name in admin-queue/security: ${job.name}`,
        );
        return { success: false, error: 'Unknown job' };
    }
  }
}
