import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);
  private readonly aiClient: AxiosInstance;

  constructor() {
    this.aiClient = axios.create({
      baseURL: process.env.EASYDEV_AI_URL || 'http://easydev-ai-platform/v1',
      headers: {
        Authorization: `Bearer ${process.env.EASYDEV_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async classifyIntent(
    tenantId: string,
    text: string,
  ): Promise<{ intent: string; confidence: number }> {
    try {
      this.logger.debug(`Classifying intent for tenant ${tenantId}`);
      const response = await this.aiClient.post('/classify', {
        text,
        tenant_id: tenantId,
      });
      return response.data; // Expected { intent: 'ORDER_TRACKING', confidence: 0.96 }
    } catch (error: any) {
      this.logger.error(`Failed to classify intent: ${error.message}`);
      throw new HttpException(
        'AI Classification failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async generateResponse(
    tenantId: string,
    context: any,
    prompt: string,
  ): Promise<string> {
    try {
      const response = await this.aiClient.post('/generate', {
        tenant_id: tenantId,
        context,
        prompt,
        temperature: 0.7,
      });
      return response.data.response;
    } catch (error: any) {
      this.logger.error(`Failed to generate response: ${error.message}`);
      throw new HttpException(
        'AI Generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reportToolResult(
    tenantId: string,
    workflowId: string,
    toolId: string,
    result: any,
  ) {
    try {
      await this.aiClient.post(`/workflows/${workflowId}/tool-results`, {
        tenant_id: tenantId,
        tool_id: toolId,
        result,
      });
    } catch (error: any) {
      this.logger.error(`Failed to report tool result: ${error.message}`);
    }
  }
}
