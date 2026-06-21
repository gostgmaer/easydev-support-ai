import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AIPlatformClient {
  private readonly logger = new Logger(AIPlatformClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.EASYDEV_AI_URL || 'https://api.easydev.ai';
    this.apiKey =
      process.env.EASYDEV_AI_API_KEY || 'easydev_ai_api_key_default';
  }

  public async runWorkflow(
    tenantId: string,
    workflowId: string,
    conversationId: string,
    variables: Record<string, any> = {},
  ): Promise<any> {
    this.logger.log(
      `Triggering AI platform workflow ${workflowId} for conversation ${conversationId}`,
    );
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/workflows/run`,
        {
          tenantId,
          workflowId,
          conversationId,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to run workflow: ${error.message}`);
      throw new Error(
        `AI Platform workflow failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async generate(
    tenantId: string,
    prompt: string,
    systemPrompt?: string,
    config: Record<string, any> = {},
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/generate`,
        {
          tenantId,
          prompt,
          systemPrompt,
          config,
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
      this.logger.error(`Generate call failed: ${error.message}`);
      throw new Error(
        `AI Platform generate failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async classify(
    tenantId: string,
    text: string,
    classes: string[],
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/classify`,
        {
          tenantId,
          text,
          classes,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Classify call failed: ${error.message}`);
      throw new Error(
        `AI Platform classify failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async embed(tenantId: string, texts: string[]): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/embed`,
        {
          tenantId,
          texts,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Embed call failed: ${error.message}`);
      throw new Error(
        `AI Platform embed failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async rerank(
    tenantId: string,
    query: string,
    documents: string[],
    topK = 5,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/rerank`,
        {
          tenantId,
          query,
          documents,
          topK,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Rerank call failed: ${error.message}`);
      throw new Error(
        `AI Platform rerank failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async recallMemory(
    tenantId: string,
    query: string,
    key?: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/memory/recall`,
        {
          tenantId,
          query,
          key,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Memory recall failed: ${error.message}`);
      throw new Error(
        `AI Platform recall failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async getConversationContext(
    tenantId: string,
    conversationId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/memory/conversation`,
        {
          tenantId,
          conversationId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Get conversation context failed: ${error.message}`);
      throw new Error(
        `AI Platform conversation memory failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async interpretConnectorResult(
    tenantId: string,
    connectorType: string,
    resultData: any,
    context: Record<string, any> = {},
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/connectors/interpret`,
        {
          tenantId,
          connectorType,
          resultData,
          context,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Interpret connector result failed: ${error.message}`);
      throw new Error(
        `AI Platform interpret connector result failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async generateEmailDraft(
    tenantId: string,
    context: Array<{ role: string; content: string }>,
    lastCustomerMessage: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/email/draft`,
        {
          tenantId,
          context,
          lastCustomerMessage,
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
      this.logger.error(`Generate email draft failed: ${error.message}`);
      throw new Error(
        `AI Platform generate email draft failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  public async submitToolResult(
    tenantId: string,
    workflowId: string,
    toolRequestId: string,
    response: any,
    status: string,
  ): Promise<any> {
    this.logger.log(
      `Submitting tool results for workflow ${workflowId}, request ${toolRequestId}`,
    );
    try {
      const apiResponse = await axios.post(
        `${this.baseUrl}/v1/workflows/${workflowId}/tool-results`,
        {
          tenantId,
          toolRequestId,
          response,
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        },
      );
      return apiResponse.data;
    } catch (error: any) {
      this.logger.error(`Submit tool result failed: ${error.message}`);
      throw new Error(
        `AI Platform submit tool result failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }
}
