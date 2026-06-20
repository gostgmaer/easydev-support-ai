import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);

  async ingestDocument(tenantId: string, documentUrl: string, sourceType: string) {
    this.logger.log(`Ingesting document for tenant ${tenantId}: ${documentUrl}`);
    
    try {
      // Calls the dedicated EasyDev AI Platform ingestion API
      // This external API handles OCR, splitting, embedding, and vector storage
      const response = await axios.post(`${process.env.EASYDEV_AI_URL}/v1/documents/ingest`, {
        tenant_id: tenantId,
        url: documentUrl,
        type: sourceType, // 'PDF', 'WEBSITE_CRAWL', 'FAQ'
      }, {
        headers: { 'Authorization': `Bearer ${process.env.EASYDEV_AI_API_KEY}` }
      });

      return {
        status: 'PROCESSING',
        jobId: response.data.jobId,
      };
    } catch (error: any) {
      this.logger.error(`Knowledge Ingestion failed: ${error.message}`);
      throw new Error('Failed to dispatch document to AI Platform');
    }
  }
}
