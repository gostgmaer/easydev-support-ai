import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

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

  constructor() {
    this.baseUrl = process.env.EASYDEV_AI_URL || 'https://api.easydev.ai';
    this.apiKey = process.env.EASYDEV_AI_API_KEY || 'easydev_ai_api_key_default';
  }

  public async ingestDocument(
    tenantId: string,
    documentId: string,
    fileUrl: string,
    mimeType: string,
    options: Record<string, any> = {},
  ): Promise<IngestResponse> {
    this.logger.log(`Calling AI Platform ingest for document ${documentId} (tenant ${tenantId})`);
    
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
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Platform ingest call failed: ${error.message}`);
      throw new Error(`AI Platform Ingestion failed: ${error.response?.data?.message || error.message}`);
    }
  }

  public async embedTexts(tenantId: string, texts: string[]): Promise<EmbedResponse> {
    this.logger.log(`Calling AI Platform embed for ${texts.length} text segments (tenant ${tenantId})`);

    try {
      const response = await axios.post<EmbedResponse>(
        `${this.baseUrl}/v1/embed`,
        {
          tenantId,
          texts,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Platform embedding call failed: ${error.message}`);
      throw new Error(`AI Platform Embedding failed: ${error.response?.data?.message || error.message}`);
    }
  }

  public async rerank(
    tenantId: string,
    query: string,
    documents: string[],
    topK = 5,
  ): Promise<RerankResponse> {
    this.logger.log(`Calling AI Platform rerank for query (tenant ${tenantId})`);

    try {
      const response = await axios.post<RerankResponse>(
        `${this.baseUrl}/v1/rerank`,
        {
          tenantId,
          query,
          documents,
          topK,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`AI Platform reranking call failed: ${error.message}`);
      throw new Error(`AI Platform Reranking failed: ${error.response?.data?.message || error.message}`);
    }
  }
}
