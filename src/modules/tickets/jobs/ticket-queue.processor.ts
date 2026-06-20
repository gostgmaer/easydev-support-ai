import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseWorker, QueueService, QUEUES } from '@easydev/shared-queues';
import { Injectable, Optional } from '@nestjs/common';
import { TicketAssignmentService } from '../services/ticket-assignment.service';
import { TicketEscalationService } from '../services/ticket-escalation.service';
import { TicketSLAService } from '../services/ticket-sla.service';

@Processor('ticket-queue')
@Injectable()
export class TicketQueueProcessor extends BaseWorker {
  constructor(
    private readonly assignmentService: TicketAssignmentService,
    private readonly escalationService: TicketEscalationService,
    private readonly slaService: TicketSLAService,
    @Optional() queueService?: QueueService,
  ) {
    super('TicketQueueProcessor', QUEUES.TICKET, queueService);
  }

  async handleJob(job: Job<any, any, string>): Promise<any> {
    const tenantId = job.data._tenantContext?.tenantId || job.data.tenantId;
    if (!tenantId && job.name !== 'sla-monitor-job') {
      this.logger.warn(
        `Job ${job.id} [${job.name}] ran without tenantId context`,
      );
    }

    switch (job.name) {
      case 'ticket-assignment-job': {
        this.logger.log(`Processing ticket-assignment-job ${job.id}`);
        const ticket = await this.assignmentService.autoAssign(
          tenantId,
          job.data.ticketId,
          job.data.teamId,
          job.data.userId,
        );
        return { ticketId: ticket.id, assignedAgentId: ticket.assignedAgentId };
      }

      case 'ticket-escalation-job': {
        this.logger.log(`Processing ticket-escalation-job ${job.id}`);
        const ticket = await this.escalationService.escalate(
          tenantId,
          job.data.ticketId,
          job.data.reason || 'ESCALATION',
          { workflowId: job.data.workflowId, userId: job.data.userId },
        );
        return { ticketId: ticket.id, priority: ticket.priority.value };
      }

      case 'sla-monitor-job': {
        this.logger.log(`Processing sla-monitor-job ${job.id}`);
        return this.slaService.runBreachSweep(job.data.tenantId);
      }

      case 'ticket-approval-job': {
        this.logger.log(`Processing ticket-approval-job ${job.id}`);
        // Integration hand-off: notify the approver via the notification queue.
        await this.queueService?.addJob(
          QUEUES.NOTIFICATION,
          'approval-request',
          {
            ticketId: job.data.ticketId,
            approvalId: job.data.approvalId,
            approverId: job.data.approverId,
            tenantId,
          },
        );
        return { notified: true, approvalId: job.data.approvalId };
      }

      case 'ticket-analytics-job': {
        this.logger.log(`Processing ticket-analytics-job ${job.id}`);
        await this.queueService?.addJob(QUEUES.ANALYTICS, 'ticket-event', {
          ticketId: job.data.ticketId,
          eventName: job.data.eventName,
          tenantId,
        });
        return { forwarded: true, ticketId: job.data.ticketId };
      }

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
