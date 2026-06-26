import { Injectable, Logger } from '@nestjs/common';
import {
  AiOperatingPlatformClient,
  GenerationResult,
} from '@easydev/shared-clients';

/**
 * Thin wrapper around AiOperatingPlatformClient (packages/shared-clients) -
 * see that file's docstring for the full verification trail against the
 * real platform (multi-tennet-ai-agent). Kept as a NestJS-injectable
 * service so existing callers' constructor injection didn't need to
 * change.
 */
@Injectable()
export class AIPlatformClient {
  private readonly logger = new Logger(AIPlatformClient.name);
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
    this.client = new AiOperatingPlatformClient(
      process.env.EASYDEV_AI_URL,
      // EASYDEV_AI_API_KEY doubles as the request-signing secret here -
      // the platform's own request_signing.py is disabled by default
      // (AI_PLATFORM_REQUEST_SIGNING_ENABLED=false), so this is a no-op
      // until/unless a real deployment turns signing on, at which point
      // this same value (shared with whatever secret that deployment's
      // AI_PLATFORM_REQUEST_SIGNING_SECRETS__<version> holds) makes every
      // call below start signing automatically, no code change needed.
      process.env.EASYDEV_AI_API_KEY,
      process.env.EASYDEV_AI_SIGNING_KEY_VERSION || 'v1',
    );
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
      return await this.client.runWorkflow(
        tenantId,
        workflowId,
        'run_workflow',
        variables,
        { conversationId },
      );
    } catch (error: any) {
      this.logger.error(`Failed to run workflow: ${error.message}`);
      throw new Error(`AI Platform workflow failed: ${error.message}`);
    }
  }

  public async generate(
    tenantId: string,
    prompt: string,
    systemPrompt?: string,
    config: Record<string, any> = {},
  ): Promise<GenerationResult> {
    try {
      return await this.client.generate(tenantId, prompt, systemPrompt, config);
    } catch (error: any) {
      this.logger.error(`Generate call failed: ${error.message}`);
      throw new Error(`AI Platform generate failed: ${error.message}`);
    }
  }

  public async classify(tenantId: string, text: string, classes: string[]) {
    try {
      return await this.client.classify(tenantId, text, classes);
    } catch (error: any) {
      this.logger.error(`Classify call failed: ${error.message}`);
      throw new Error(`AI Platform classify failed: ${error.message}`);
    }
  }

  public async embed(tenantId: string, texts: string[]) {
    try {
      return await this.client.embed(tenantId, texts);
    } catch (error: any) {
      this.logger.error(`Embed call failed: ${error.message}`);
      throw new Error(`AI Platform embed failed: ${error.message}`);
    }
  }

  public async rerank(
    tenantId: string,
    query: string,
    documents: string[],
    topK = 5,
  ) {
    try {
      return await this.client.rerank(tenantId, query, documents, topK);
    } catch (error: any) {
      this.logger.error(`Rerank call failed: ${error.message}`);
      throw new Error(`AI Platform rerank failed: ${error.message}`);
    }
  }

  /**
   * KNOWN GAP: no dedicated memory endpoint maps cleanly to "recall by
   * query" the way the old (broken) /v1/memory/recall call assumed -
   * the real endpoint exists and is wired correctly now via the shared
   * client; returning the raw memories list rather than inventing a
   * narrower shape.
   */
  public async recallMemory(tenantId: string, query: string, key?: string) {
    try {
      const { memories } = await this.client.recallMemory(tenantId, query, key);
      return memories;
    } catch (error: any) {
      this.logger.error(`Memory recall failed: ${error.message}`);
      throw new Error(`AI Platform recall failed: ${error.message}`);
    }
  }

  public async getConversationContext(
    tenantId: string,
    conversationId: string,
  ) {
    try {
      const { messages } = await this.client.getConversationHistory(
        tenantId,
        conversationId,
      );
      return messages;
    } catch (error: any) {
      this.logger.error(`Get conversation context failed: ${error.message}`);
      throw new Error(
        `AI Platform conversation memory failed: ${error.message}`,
      );
    }
  }

  public async interpretConnectorResult(
    tenantId: string,
    connectorType: string,
    resultData: any,
    context: Record<string, any> = {},
  ): Promise<GenerationResult> {
    try {
      return await this.client.interpretConnectorResult(
        tenantId,
        connectorType,
        resultData,
        context,
      );
    } catch (error: any) {
      this.logger.error(`Interpret connector result failed: ${error.message}`);
      throw new Error(
        `AI Platform interpret connector result failed: ${error.message}`,
      );
    }
  }

  public async generateEmailDraft(
    tenantId: string,
    context: Array<{ role: string; content: string }>,
    lastCustomerMessage: string,
  ): Promise<GenerationResult> {
    try {
      return await this.client.generateEmailDraft(
        tenantId,
        context,
        lastCustomerMessage,
      );
    } catch (error: any) {
      this.logger.error(`Generate email draft failed: ${error.message}`);
      throw new Error(
        `AI Platform generate email draft failed: ${error.message}`,
      );
    }
  }

  public async submitToolResult(
    tenantId: string,
    workflowId: string,
    toolName: string,
    response: any,
    _status: string,
  ): Promise<any> {
    this.logger.log(
      `Submitting tool result for workflow ${workflowId}, tool ${toolName}`,
    );
    try {
      return await this.client.submitToolResult(
        tenantId,
        workflowId,
        toolName,
        response,
      );
    } catch (error: any) {
      this.logger.error(`Submit tool result failed: ${error.message}`);
      throw new Error(
        `AI Platform submit tool result failed: ${error.message}`,
      );
    }
  }
}
