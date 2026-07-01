import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { AIPlatformClient } from './ai-platform.client';
import { KnowledgePermissionService } from './knowledge-permission.service';
import { KnowledgeSearchLog } from '../domain/knowledge-search-log.entity';
import { SearchQueryDto } from '../dtos/knowledge.dto';

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);

  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
    private readonly aiClient: AIPlatformClient,
    private readonly permissionService: KnowledgePermissionService,
  ) {}

  public async search(
    tenantId: string,
    dto: SearchQueryDto,
    userId?: string,
    teamId?: string,
    role?: string,
  ): Promise<any> {
    const startTime = Date.now();
    this.logger.log(
      `Performing knowledge search: "${dto.query}" (tenant ${tenantId})`,
    );

    // 1. Fetch filtered documents from database
    const paginated = await this.repository.findDocuments(tenantId, {
      sourceId: dto.sourceId,
      categoryId: dto.categoryId,
      status: dto.status || 'ACTIVE',
      language: dto.language,
      search: dto.query,
      tags: dto.tags,
      limit: dto.limit || 50,
    });

    // Team/role ACL enforcement - findDocuments() only filters by tenant,
    // category, status, etc. A document with permission rows that don't
    // match this caller must never appear in search results, no matter how
    // it scored. Anonymous public callers pass teamId/role as undefined,
    // which checkAccess already treats as "no team/role match" - they only
    // see documents with zero ACL rows or an explicit public grant.
    const accessFlags = await Promise.all(
      paginated.data.map((d) =>
        this.permissionService.checkAccess(
          tenantId,
          d.id,
          teamId,
          role,
          'READ',
        ),
      ),
    );
    const docs = paginated.data.filter((_, i) => accessFlags[i]);

    if (docs.length === 0) {
      await this.logSearch(
        tenantId,
        dto.query,
        0,
        Date.now() - startTime,
        userId,
        dto,
      );
      return [];
    }

    // 2. Perform Reranking using AI Platform if query is substantive and we have multiple docs
    let finalResults = docs.map((d) => ({
      document: d.toJSON(),
      score: 1.0,
    }));

    if (dto.query.trim().length > 2 && docs.length > 1) {
      try {
        const docContents = docs.map(
          (d) => `${d.title}\n${JSON.stringify(d.metadata || {})}`,
        );

        const rerankResult = await this.aiClient.rerank(
          tenantId,
          dto.query,
          docContents,
          dto.limit || 10,
        );

        // Map scores back to docs
        const scoredMap = new Map<number, number>();
        for (const res of rerankResult.results) {
          scoredMap.set(res.index, res.score);
        }

        finalResults = docs
          .map((d, index) => ({
            document: d.toJSON(),
            score: scoredMap.get(index) ?? 0.0,
          }))
          .sort((a, b) => b.score - a.score);
      } catch (err: any) {
        this.logger.warn(
          `AI Platform reranking failed: ${err.message}. Defaulting to keyword ordering.`,
        );
      }
    }

    const latency = Date.now() - startTime;
    await this.logSearch(
      tenantId,
      dto.query,
      finalResults.length,
      latency,
      userId,
      dto,
    );

    return finalResults;
  }

  private async logSearch(
    tenantId: string,
    query: string,
    resultsCount: number,
    latencyMs: number,
    userId?: string,
    filters?: Record<string, any>,
  ): Promise<void> {
    try {
      const log = new KnowledgeSearchLog(crypto.randomUUID(), {
        tenantId,
        userId,
        query,
        filters,
        resultsCount,
        latencyMs,
        source: 'API',
      });
      await this.repository.addSearchLog(log, tenantId);
    } catch (err: any) {
      this.logger.warn(`Failed to log search query: ${err.message}`);
    }
  }
}
import * as crypto from 'crypto';
