import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiToolRequest, AiToolResult } from '../domain/entities';
import { ToolStatusEnum } from '../domain/value-objects';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { AIPlatformClient } from './ai-platform.client';
import { AiEventPublisher } from './ai-event.publisher';
import {
  AiToolRequestedEvent,
  AiToolCompletedEvent,
} from '@easydev/shared-events';
import * as crypto from 'crypto';

@Injectable()
export class AiToolExecutionService {
  private readonly logger = new Logger(AiToolExecutionService.name);

  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
    private readonly connectorService: ConnectorExecutionService,
    private readonly aiClient: AIPlatformClient,
    private readonly eventPublisher: AiEventPublisher,
  ) {}

  public async executeTool(
    tenantId: string,
    workflowExecutionId: string,
    workflowId: string,
    toolName: string,
    capability: string,
    payload: Record<string, any>,
  ): Promise<any> {
    const requestId = crypto.randomUUID();
    const request = new AiToolRequest(requestId, {
      tenantId,
      workflowExecutionId,
      toolName,
      capability,
      payload,
      status: ToolStatusEnum.PENDING,
    });

    await this.repository.saveToolRequest(request, tenantId);
    await this.eventPublisher.publish(
      new AiToolRequestedEvent(
        tenantId,
        requestId,
        workflowExecutionId,
        toolName,
        capability,
      ),
    );

    try {
      this.logger.log(
        `Executing tool capability ${capability} for tool ${toolName} (tenant ${tenantId})`,
      );

      // Execute capability on the connector
      const responsePayload = await this.connectorService.executeCapability(
        tenantId,
        capability as any,
        payload,
        {
          workflowId: workflowExecutionId,
        },
      );

      request.complete();
      await this.repository.saveToolRequest(request, tenantId);

      const resultId = crypto.randomUUID();
      const result = new AiToolResult(resultId, {
        tenantId,
        toolRequestId: requestId,
        response: responsePayload || {},
        status: ToolStatusEnum.SUCCESS,
      });

      await this.repository.saveToolResult(result, tenantId);

      // Post results back to AI Platform Tool Result API
      await this.aiClient.submitToolResult(
        tenantId,
        workflowId,
        requestId,
        responsePayload,
        'SUCCESS',
      );

      await this.eventPublisher.publish(
        new AiToolCompletedEvent(
          tenantId,
          requestId,
          workflowExecutionId,
          'SUCCESS',
        ),
      );

      return responsePayload;
    } catch (error: any) {
      this.logger.error(`Tool execution failed: ${error.message}`);
      request.fail();
      await this.repository.saveToolRequest(request, tenantId);

      const resultId = crypto.randomUUID();
      const result = new AiToolResult(resultId, {
        tenantId,
        toolRequestId: requestId,
        response: { error: error.message },
        status: ToolStatusEnum.FAILED,
      });

      await this.repository.saveToolResult(result, tenantId);

      // Post failures back to AI Platform
      try {
        await this.aiClient.submitToolResult(
          tenantId,
          workflowId,
          requestId,
          { error: error.message },
          'FAILED',
        );
      } catch (err: any) {
        this.logger.warn(
          `Failed to submit tool failure status to AI platform: ${err.message}`,
        );
      }

      await this.eventPublisher.publish(
        new AiToolCompletedEvent(
          tenantId,
          requestId,
          workflowExecutionId,
          'FAILED',
        ),
      );

      throw error;
    }
  }
}
