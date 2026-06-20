import { Injectable, Logger } from '@nestjs/common';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class SettingsEventPublisher {
  private readonly logger = new Logger(SettingsEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  async publish(
    tenantId: string,
    eventName: string,
    payload: any,
  ): Promise<void> {
    this.logger.log(
      `Publishing Settings Event: ${eventName} for Tenant: ${tenantId}`,
    );

    try {
      // Add settings-sync-job to settings queue
      await this.queueService.addJob('settings-queue', 'settings-sync-job', {
        tenantId,
        eventName,
        payload,
      });

      // Add settings-audit-job to audit settings updates
      await this.queueService.addJob('settings-queue', 'settings-audit-job', {
        tenantId,
        eventName,
        payload,
      });

      if (eventName === 'feature_flag.updated') {
        // Trigger feature flag refresh job to invalidate caches
        await this.queueService.addJob(
          'settings-queue',
          'feature-flag-refresh-job',
          { tenantId, flagKey: payload.featureKey },
        );
      }

      if (eventName === 'usage_limit.updated') {
        // Trigger usage limit verification
        await this.queueService.addJob('settings-queue', 'usage-limit-job', {
          tenantId,
        });
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to enqueue settings background jobs for event ${eventName}: ${err.message}`,
      );
    }
  }
}
