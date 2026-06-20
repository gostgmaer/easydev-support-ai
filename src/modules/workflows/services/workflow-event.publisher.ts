import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '@easydev/shared-kernel';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class WorkflowEventPublisher {
  private readonly logger = new Logger(WorkflowEventPublisher.name);

  constructor(private readonly queueService: QueueService) {}

  public async publish(event: DomainEvent): Promise<void> {
    const eventName =
      (event.constructor as any).eventName || event.constructor.name;
    this.logger.log(
      `Publishing Workflow Domain Event: ${eventName} for aggregate: ${event.getAggregateId()}`,
    );

    try {
      // Route events to BullMQ jobs
      if (eventName === 'workflow.execution.started') {
        const e = event as any;
        await this.queueService.addJob(
          'workflow-queue',
          'workflow-execution-job',
          {
            tenantId: e.tenantId,
            executionId: e.executionId,
            workflowId: e.workflowId,
          },
        );
      }

      if (eventName === 'workflow.approval.requested') {
        const e = event as any;
        await this.queueService.addJob(
          'workflow-queue',
          'workflow-approval-job',
          {
            tenantId: e.tenantId,
            approvalId: e.approvalId,
            executionId: e.executionId,
            approverId: e.approverId,
          },
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to publish workflow event ${eventName}: ${err.message}`,
      );
    }
  }

  public async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}
