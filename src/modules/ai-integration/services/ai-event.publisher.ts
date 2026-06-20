import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class AiEventPublisher {
  private readonly logger = new Logger(AiEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  public async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing AI Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      // Route events to BullMQ jobs
      if (eventName === 'ai.workflow.started') {
        const e = event as any;
        await this.queueService.addJob('ai-queue' as any, 'ai-workflow-job', {
          tenantId: e.tenantId,
          workflowExecutionId: e.workflowExecutionId,
          workflowId: e.workflowId,
          conversationId: e.conversationId,
        });
      }

      if (eventName === 'ai.tool.requested') {
        const e = event as any;
        await this.queueService.addJob(
          'ai-queue' as any,
          'ai-tool-execution-job',
          {
            tenantId: e.tenantId,
            toolRequestId: e.toolRequestId,
            workflowExecutionId: e.workflowExecutionId,
            toolName: e.toolName,
            capability: e.capability,
          },
        );
      }

      if (eventName === 'ai.escalation.created') {
        const e = event as any;
        await this.queueService.addJob('ai-queue' as any, 'ai-escalation-job', {
          tenantId: e.tenantId,
          escalationId: e.escalationId,
          conversationId: e.conversationId,
          reason: e.reason,
          escalatedTo: e.escalatedTo,
        });
      }

      if (eventName === 'ai.usage.recorded') {
        const e = event as any;
        await this.queueService.addJob('ai-queue' as any, 'ai-usage-job', {
          tenantId: e.tenantId,
          agentId: e.agentId,
          date: e.date,
          tokensUsed: e.tokensUsed,
          cost: e.cost,
        });
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to publish AI event ${eventName}: ${err.message}`,
      );
    }
  }

  public async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
