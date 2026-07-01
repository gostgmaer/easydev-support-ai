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
import { QueueService } from '@easydev/shared-queues';
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
    private readonly queueService: QueueService,
  ) {}

  // Decoupled from the tool-execution flow itself: a submission failure here
  // must never be confused with - or retried as - the connector action
  // itself (which may not be safely repeatable, e.g. a refund). Routed
  // through its own durable queued job (AiQueueProcessor, already a
  // BaseWorker with retry + dead-letter routing) so the AI platform
  // eventually learns the real outcome instead of it being lost on the
  // first network blip.
  private async submitToolResult(
    tenantId: string,
    workflowId: string,
    requestId: string,
    // The AI platform's provide_tool_result endpoint matches this against
    // the workflow's own pending_tool_name and 409s on a mismatch - it
    // must be the actual tool name (e.g. "order_lookup"), not a request/
    // correlation id. requestId is still tracked separately below for the
    // retry job and connector-level idempotency.
    toolName: string,
    payload: any,
    status: 'SUCCESS' | 'FAILED',
  ): Promise<void> {
    try {
      await this.aiClient.submitToolResult(
        tenantId,
        workflowId,
        toolName,
        payload,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to submit tool ${status} status to AI platform directly; queuing for retry: ${err.message}`,
      );
      await this.queueService.addJob(
        'ai-queue',
        'ai-tool-result-submission-job',
        { tenantId, workflowId, requestId, toolName, payload, status },
      );
    }
  }

  public async executeTool(
    tenantId: string,
    workflowExecutionId: string,
    workflowId: string,
    toolName: string,
    capability: string,
    payload: Record<string, any>,
    // RR-18: the AI Platform's own stable id for this tool call, when it
    // supplies one (e.g. job.data.toolRequestId from a BullMQ retry, or a
    // redispatch after the platform timed out waiting for a result it
    // never got because the process crashed between the connector call
    // succeeding and submitToolResult being reached). Used as the
    // connector-level idempotency key so a second invocation of the SAME
    // logical tool call - not just a second attempt at submitting its
    // result - returns the already-recorded outcome instead of re-running
    // a side-effecting action like a refund. Falls back to a fresh internal
    // id for callers that don't supply one (unchanged behavior for those).
    externalRequestId?: string,
  ): Promise<any> {
    const requestId = crypto.randomUUID();
    const idempotencyKey = externalRequestId || requestId;
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
          idempotencyKey,
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

      // Post results back to AI Platform Tool Result API. A submission
      // failure here must not be conflated with the connector action itself
      // having failed - it already succeeded and is recorded as such above.
      await this.submitToolResult(
        tenantId,
        workflowId,
        requestId,
        toolName,
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
      await this.submitToolResult(
        tenantId,
        workflowId,
        requestId,
        toolName,
        { error: error.message },
        'FAILED',
      );

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
