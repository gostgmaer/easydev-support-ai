import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AiOperatingPlatformClient,
  RerankResult as SharedRerankResult,
} from '@easydev/shared-clients';

export interface IngestResponse {
  jobId: string;
  status: string;
  chunks?: { content: string; tokenCount: number; hash: string }[];
}

export interface EmbedResponse {
  embeddings: number[][];
}

export interface RerankResult {
  index: number;
  score: number;
}

export interface RerankResponse {
  results: RerankResult[];
}

@Injectable()
export class AIPlatformClient {
  private readonly logger = new Logger(AIPlatformClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly client: AiOperatingPlatformClient;

  constructor() {
    if (!process.env.EASYDEV_AI_URL) {
      throw new Error(
        'EASYDEV_AI_URL must be set - refusing to start with no configured AI Platform endpoint',
      );
    }
    if (!process.env.EASYDEV_AI_API_KEY) {
      throw new Error(
        'EASYDEV_AI_API_KEY must be set - refusing to start with no configured AI Platform API key',
      );
    }
    this.baseUrl = process.env.EASYDEV_AI_URL;
    this.apiKey = process.env.EASYDEV_AI_API_KEY;
    this.client = new AiOperatingPlatformClient(
      this.baseUrl,
      this.apiKey,
      process.env.EASYDEV_AI_SIGNING_KEY_VERSION || 'v1',
    );
  }

  /**
   * KNOWN GAP, not fixed here: verified directly against the real AI
   * platform's app/api/routes/documents.py - POST /v1/documents/ingest
   * is synchronous (no polling, unlike the core_ai capabilities below) but
   * takes raw extracted `content: str` directly, not a fileUrl for the
   * platform to fetch - and returns only {document_id, namespace,
   * source_type}, no per-chunk content/tokenCount/hash at all (chunking
   * and embedding happen internally in the platform's own vector store).
   *
   * KnowledgeSyncService.triggerIngestion only has doc.fileUrl/sourceUri
   * (no extracted text), and KnowledgeChunkService assumes it owns and
   * stores chunks locally from whatever this method returns. Bridging
   * that needs either a text-extraction step before calling this (PDF/
   * HTML -> plain text, not something this app currently does anywhere)
   * or abandoning local chunk storage in favor of the platform's vector
   * store - a real architecture decision, not something to guess at here.
   * Left as the original (already broken) implementation rather than a
   * partial fix that would silently change behavior without resolving
   * the actual blocker.
   */
  public async ingestDocument(
    tenantId: string,
    documentId: string,
    fileUrl: string,
    mimeType: string,
    options: Record<string, any> = {},
  ): Promise<IngestResponse> {
    this.logger.log(
      `Calling AI Platform ingest for document ${documentId} (tenant ${tenantId})`,
    );

    try {
      const response = await axios.post<IngestResponse>(
        `${this.baseUrl}/v1/documents/ingest`,
        {
          tenantId,
          documentId,
          fileUrl,
          mimeType,
          chunkSize: options.chunkSize || 500,
          chunkOverlap: options.chunkOverlap || 50,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Platform ingest call failed: ${error.message}`);
      throw new Error(
        `AI Platform Ingestion failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async embedTexts(
    tenantId: string,
    texts: string[],
  ): Promise<EmbedResponse> {
    this.logger.log(
      `Calling AI Platform embed for ${texts.length} text segments (tenant ${tenantId})`,
    );
    try {
      const result = await this.client.embed(tenantId, texts);
      return {
        embeddings: result.chunks.map((c) => c.embedding || []),
      };
    } catch (error: any) {
      this.logger.error(`AI Platform embedding call failed: ${error.message}`);
      throw new Error(`AI Platform Embedding failed: ${error.message}`);
    }
  }

  public async rerank(
    tenantId: string,
    query: string,
    documents: string[],
    topK = 5,
  ): Promise<RerankResponse> {
    this.logger.log(
      `Calling AI Platform rerank for query (tenant ${tenantId})`,
    );
    try {
      const result: SharedRerankResult = await this.client.rerank(
        tenantId,
        query,
        documents,
        topK,
      );
      return { results: result.ranked };
    } catch (error: any) {
      this.logger.error(`AI Platform reranking call failed: ${error.message}`);
      throw new Error(`AI Platform Reranking failed: ${error.message}`);
    }
  }
}
