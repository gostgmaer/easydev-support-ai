import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IAiRepository } from '../repositories/ai-repository.interface';
import { AiUsageMetric } from '../domain/entities';
import { AiEventPublisher } from './ai-event.publisher';
import {
  AiUsageRecordedEvent,
  AiResponseGeneratedEvent,
} from '@easydev/shared-events';
import * as crypto from 'crypto';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @Inject('IAiRepository')
    private readonly repository: IAiRepository,
    private readonly eventPublisher: AiEventPublisher,
  ) {}

  public async recordUsage(
    tenantId: string,
    agentId: string,
    tokens: number,
    cost: number,
    workflowInc = false,
    toolCallsCount = 0,
  ): Promise<AiUsageMetric> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    this.logger.log(
      `Recording usage metrics for agent ${agentId} on ${today} (tokens: ${tokens}, cost: $${cost})`,
    );

    let metric = await this.repository.getUsageMetric(agentId, today, tenantId);
    if (!metric) {
      const metricId = crypto.randomUUID();
      metric = new AiUsageMetric(metricId, {
        tenantId,
        agentId,
        date: today,
        requests: 0,
        tokens: 0,
        cost: 0.0,
        workflowCount: 0,
        toolCalls: 0,
      });
    }

    metric.recordRequest(tokens, cost, workflowInc, toolCallsCount);
    await this.repository.saveUsageMetric(metric, tenantId);

    await this.eventPublisher.publish(
      new AiUsageRecordedEvent(tenantId, agentId, today, tokens, cost),
    );

    return metric;
  }

  public async getUsageMetrics(
    tenantId: string,
    agentId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AiUsageMetric[]> {
    return this.repository.findUsageMetrics(
      tenantId,
      agentId,
      startDate,
      endDate,
    );
  }

  public async logResponse(
    tenantId: string,
    conversationId: string,
    messageId: string,
    workflowExecutionId: string | undefined,
    responseType: string,
    responseTimeMs: number,
    confidenceScore: number | undefined,
    tokensUsed: number,
    cost: number,
  ): Promise<void> {
    const id = crypto.randomUUID();
    await this.repository.logResponse(
      {
        id,
        conversationId,
        messageId,
        workflowExecutionId,
        responseType,
        responseTimeMs,
        confidenceScore,
        tokensUsed,
        cost,
      },
      tenantId,
    );

    await this.eventPublisher.publish(
      new AiResponseGeneratedEvent(
        tenantId,
        conversationId,
        messageId,
        responseType,
        tokensUsed,
        cost,
      ),
    );
  }
}
