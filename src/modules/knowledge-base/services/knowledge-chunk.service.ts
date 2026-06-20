import { Injectable, Inject } from '@nestjs/common';
import type { IKnowledgeRepository } from '../repositories/knowledge-repository.interface';
import { KnowledgeChunk } from '../domain/knowledge-chunk.entity';

@Injectable()
export class KnowledgeChunkService {
  constructor(
    @Inject('IKnowledgeRepository')
    private readonly repository: IKnowledgeRepository,
  ) {}

  public async saveChunks(
    tenantId: string,
    documentId: string,
    chunksData: {
      content: string;
      chunkIndex: number;
      tokenCount: number;
      externalRef?: string;
      metadata?: Record<string, any>;
    }[],
  ): Promise<void> {
    const chunks = chunksData.map((d) => {
      const hash = crypto.createHash('sha256').update(d.content).digest('hex');
      return new KnowledgeChunk(crypto.randomUUID(), {
        tenantId,
        documentId,
        chunkIndex: d.chunkIndex,
        chunkHash: hash,
        content: d.content,
        tokenCount: d.tokenCount,
        externalRef: d.externalRef,
        metadata: d.metadata,
      });
    });

    await this.repository.saveChunks(chunks, tenantId);
  }

  public async getChunks(
    tenantId: string,
    documentId: string,
  ): Promise<KnowledgeChunk[]> {
    return this.repository.getChunksByDocumentId(documentId, tenantId);
  }

  public async deleteChunks(
    tenantId: string,
    documentId: string,
  ): Promise<void> {
    await this.repository.deleteChunksByDocumentId(documentId, tenantId);
  }
}
import * as crypto from 'crypto';
