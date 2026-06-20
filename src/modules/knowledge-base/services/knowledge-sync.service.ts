import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { AIPlatformClient } from './ai-platform.client';
import { CrawlerService } from './crawler.service';
import { KnowledgeDocumentService } from './knowledge-document.service';
import { KnowledgeChunkService } from './knowledge-chunk.service';
import { KnowledgeSyncJob } from '../domain/knowledge-sync-job.entity';
import { DocumentStatusEnum, SyncStatusEnum } from '../domain/value-objects';
import { QueueService, QUEUES } from '@easydev/shared-queues';

@Injectable()
export class KnowledgeSyncService {
  private readonly logger = new Logger(KnowledgeSyncService.name);

  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
    private readonly aiClient: AIPlatformClient,
    private readonly crawlerService: CrawlerService,
    private readonly documentService: KnowledgeDocumentService,
    private readonly chunkService: KnowledgeChunkService,
    private readonly queueService: QueueService,
  ) {}

  public async triggerIngestion(
    tenantId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.repository.findById(documentId, tenantId);
    if (!doc) {
      throw new BadRequestException(`Document ${documentId} not found`);
    }

    if (!doc.fileUrl && !doc.sourceUri) {
      throw new BadRequestException(
        `Document has no URL or URI source reference`,
      );
    }

    const jobId = crypto.randomUUID();
    const syncJob = new KnowledgeSyncJob(jobId, {
      tenantId,
      sourceId: doc.sourceId,
      documentId: doc.id,
      jobType: 'INGEST',
      status: 'PENDING',
    });

    await this.repository.saveSyncJob(syncJob, tenantId);

    try {
      doc.startIngestion(jobId);
      await this.repository.save(doc, tenantId);

      syncJob.start();
      await this.repository.saveSyncJob(syncJob, tenantId);

      // Call AI Platform
      const ingestResult = await this.aiClient.ingestDocument(
        tenantId,
        doc.id,
        doc.fileUrl || doc.sourceUri || '',
        doc.mimeType || 'text/plain',
        {
          chunkSize: doc.metadata?.chunkSize,
          chunkOverlap: doc.metadata?.chunkOverlap,
        },
      );

      // AI Platform returns the list of sliced chunks
      const chunks = ingestResult.chunks || [];
      if (chunks.length > 0) {
        await this.chunkService.saveChunks(
          tenantId,
          doc.id,
          chunks.map((c, idx) => ({
            content: c.content,
            chunkIndex: idx,
            tokenCount: c.tokenCount,
            externalRef: c.hash,
          })),
        );
      }

      doc.completeIngestion(chunks.length);
      doc.markEmbedded(); // Best-effort mark active
      await this.repository.save(doc, tenantId);

      // Create snapshot version history
      await this.documentService.publishDocument(tenantId, doc.id, {
        changeSummary: 'Document ingested and parsed successfully.',
      });

      syncJob.complete({ chunksCount: chunks.length });
      await this.repository.saveSyncJob(syncJob, tenantId);
    } catch (err: any) {
      this.logger.error(`Document ingestion failed: ${err.message}`);
      doc.failIngestion(err.message);
      await this.repository.save(doc, tenantId);

      syncJob.fail(err.message);
      await this.repository.saveSyncJob(syncJob, tenantId);
    }
  }

  public async triggerWebsiteCrawl(
    tenantId: string,
    sourceId: string,
  ): Promise<void> {
    const source = await this.repository.getSourceById(sourceId, tenantId);
    if (!source || !source.uri) {
      throw new BadRequestException(
        `Knowledge Source ${sourceId} has no website URL configured`,
      );
    }

    const jobId = crypto.randomUUID();
    const syncJob = new KnowledgeSyncJob(jobId, {
      tenantId,
      sourceId,
      jobType: 'CRAWL',
      status: 'PENDING',
    });

    await this.repository.saveSyncJob(syncJob, tenantId);

    // Enqueue crawl job in BullMQ
    await this.queueService.addJob(QUEUES.KNOWLEDGE, 'knowledge-crawl-job', {
      tenantId,
      sourceId,
      jobId,
    });

    source.startSync(jobId);
    await this.repository.saveSource(source, tenantId);
  }

  public async processCrawlJob(
    tenantId: string,
    sourceId: string,
    jobId: string,
  ): Promise<void> {
    const job = await this.repository.getSyncJobById(jobId, tenantId);
    const source = await this.repository.getSourceById(sourceId, tenantId);

    if (!job || !source || !source.uri) return;

    job.start();
    await this.repository.saveSyncJob(job, tenantId);

    try {
      // Crawl sitemap first if configured, else fallback to recursive link scraping
      let urls: string[] = [];
      const config = source.config || {};

      if (config.sitemapUrl) {
        urls = await this.crawlerService.parseSitemap(config.sitemapUrl);
      }

      if (urls.length === 0) {
        // Run deep crawl
        const pages = await this.crawlerService.crawlWebsite(
          source.uri,
          config.maxPages || 20,
          config.rateLimitMs || 200,
        );

        job.updateProgress(pages.length, 0, pages.length);
        await this.repository.saveSyncJob(job, tenantId);

        let successCount = 0;
        for (const page of pages) {
          try {
            // Generate clean slug from URL path
            const slug = page.url
              .replace(/^https?:\/\//, '')
              .replace(/[^a-zA-Z0-9]/g, '-');

            const doc = await this.documentService.createDocument(tenantId, {
              sourceId: source.id,
              title: page.title || 'Crawled Webpage',
              slug,
              documentType: anyToDocType(source.sourceType),
              language: 'en',
              fileUrl: page.url,
              storageProvider: 'website',
              mimeType: 'text/html',
              checksum: page.checksum,
              metadata: {
                url: page.url,
                scrapedText: page.content.slice(0, 1000),
              },
            });

            // Run direct ingestion on this document
            await this.triggerIngestion(tenantId, doc.id);
            successCount++;
          } catch (err: any) {
            this.logger.error(
              `Failed to ingest page ${page.url}: ${err.message}`,
            );
          }
        }

        source.completeSync(successCount);
        await this.repository.saveSource(source, tenantId);

        job.complete({ crawledCount: pages.length, successCount });
        await this.repository.saveSyncJob(job, tenantId);
      } else {
        // Sitemap discovery flow
        job.updateProgress(0, 0, urls.length);
        await this.repository.saveSyncJob(job, tenantId);

        let processed = 0;
        let failed = 0;

        for (const url of urls) {
          try {
            const slug = url
              .replace(/^https?:\/\//, '')
              .replace(/[^a-zA-Z0-9]/g, '-');
            const doc = await this.documentService.createDocument(tenantId, {
              sourceId: source.id,
              title: 'Sitemap Webpage',
              slug,
              documentType: anyToDocType(source.sourceType),
              language: 'en',
              fileUrl: url,
              storageProvider: 'website',
              mimeType: 'text/html',
              metadata: { url },
            });

            // Direct ingestion
            await this.triggerIngestion(tenantId, doc.id);
            processed++;
          } catch (err: any) {
            failed++;
            this.logger.error(
              `Failed to ingest sitemap URL ${url}: ${err.message}`,
            );
          }

          job.updateProgress(processed, failed, urls.length);
          await this.repository.saveSyncJob(job, tenantId);
        }

        source.completeSync(processed);
        await this.repository.saveSource(source, tenantId);

        job.complete({ sitemapCount: urls.length, processed, failed });
        await this.repository.saveSyncJob(job, tenantId);
      }
    } catch (err: any) {
      this.logger.error(`Website crawl job failed: ${err.message}`);
      source.failSync(err.message);
      await this.repository.saveSource(source, tenantId);

      job.fail(err.message);
      await this.repository.saveSyncJob(job, tenantId);
    }
  }
}

function anyToDocType(sourceType: string): any {
  if (
    sourceType === 'WEBSITE' ||
    sourceType === 'SITEMAP' ||
    sourceType === 'URL'
  ) {
    return DocumentTypeEnum.WEBPAGE;
  }
  return DocumentTypeEnum.MANUAL;
}

import * as crypto from 'crypto';
import { DocumentTypeEnum } from '../domain/value-objects';
