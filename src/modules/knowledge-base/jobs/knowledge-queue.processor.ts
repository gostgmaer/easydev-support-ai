import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES, WORKER_OPTIONS } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { KnowledgeSyncService } from '../services/knowledge-sync.service';

@Processor('knowledge-queue', WORKER_OPTIONS)
@Injectable()
export class KnowledgeQueueProcessor extends BaseWorker {
  constructor(
    private readonly syncService: KnowledgeSyncService,
    @Optional() queueService?: QueueService,
  ) {
    super('KnowledgeQueueProcessor', QUEUES.KNOWLEDGE, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId) {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
      );
    }

    switch (job.name) {
      case 'knowledge-ingestion-job':
        this.logger.log(
          `Processing knowledge-ingestion-job ${job.id} for document ${job.data.documentId}`,
        );
        return this.syncService.triggerIngestion(tenantId, job.data.documentId);

      case 'knowledge-sync-job':
        this.logger.log(
          `Processing knowledge-sync-job ${job.id} for source ${job.data.sourceId}`,
        );
        // Background sync source (which can kick off crawls or imports)
        return this.syncService.processCrawlJob(
          tenantId,
          job.data.sourceId,
          job.data.jobId,
        );

      case 'knowledge-crawl-job':
        this.logger.log(
          `Processing knowledge-crawl-job ${job.id} for source ${job.data.sourceId}`,
        );
        return this.syncService.processCrawlJob(
          tenantId,
          job.data.sourceId,
          job.data.jobId,
        );

      case 'knowledge-index-job':
        this.logger.log(`Processing knowledge-index-job ${job.id}`);
        // Stub/No-op: AI Platform client handles direct indexing during ingestion
        return { indexed: true, documentId: job.data.documentId };

      case 'knowledge-cleanup-job':
        this.logger.log(`Processing knowledge-cleanup-job ${job.id}`);
        // Stub/No-op: cleanup deleted documents and orphaned chunks
        return { cleaned: true, timestamp: new Date() };

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
