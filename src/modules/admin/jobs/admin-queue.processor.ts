import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Optional } from '@nestjs/common';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { AdminHealthService } from '../services/admin-health.service';
import { AdminWebhookService } from '../services/admin-webhook.service';
import { AdminIncidentService } from '../services/admin-incident.service';
import { AdminOverrideService } from '../services/admin-override.service';
import { AuditService } from '../../audit/audit.service';
import { IncidentSeverityEnum } from '../domain/value-objects';

@Processor('admin-queue')
@Injectable()
export class AdminQueueProcessor extends BaseWorker {
  constructor(
    private readonly healthService: AdminHealthService,
    private readonly webhookService: AdminWebhookService,
    private readonly incidentService: AdminIncidentService,
    private readonly overrideService: AdminOverrideService,
    private readonly auditService: AuditService,
    @Optional() queueService?: QueueService,
  ) {
    super('AdminQueueProcessor', QUEUES.ADMIN, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;

    switch (job.name) {
      case 'admin-health-job': {
        this.logger.log(`Processing admin-health-job ${job.id}`);
        if (tenantId) {
          const results = await this.healthService.runHealthSweep(tenantId);
          return { checked: results.length };
        }
        await this.healthService.refreshConnectorHealth(job.data.limit || 50);
        return { refreshedConnectorHealth: true };
      }

      case 'admin-audit-job': {
        this.logger.log(`Processing admin-audit-job ${job.id}`);
        await this.auditService.log({
          tenantId,
          userId: job.data.userId,
          action: job.data.action,
          details: job.data.details,
          createdBy: job.data.createdBy,
        });
        return { logged: true };
      }

      case 'admin-webhook-job': {
        this.logger.log(`Processing admin-webhook-job ${job.id}`);
        await this.webhookService.dispatchEvent(tenantId, job.data.eventName, job.data.payload);
        return { dispatched: true };
      }

      case 'admin-incident-job': {
        this.logger.log(`Processing admin-incident-job ${job.id}`);
        if (job.data.resolve) {
          const resolved = await this.incidentService.resolveByService(
            tenantId,
            job.data.affectedService,
          );
          return { resolvedIncidentId: resolved?.id ?? null };
        }
        const incident = await this.incidentService.openOrEscalate(
          tenantId,
          job.data.affectedService,
          job.data.title,
          (job.data.severity as IncidentSeverityEnum) || IncidentSeverityEnum.MEDIUM,
          job.data.description,
        );
        return { incidentId: incident.id };
      }

      case 'admin-cleanup-job': {
        this.logger.log(`Processing admin-cleanup-job ${job.id}`);
        const removed = await this.overrideService.processExpiredOverrides(
          job.data.limit || 500,
        );
        return { removedOverrides: removed };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
