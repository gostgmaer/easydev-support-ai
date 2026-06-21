import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import type { ITicketRepository } from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketAssignment } from '../domain/ticket-assignment.entity';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { TriggerTypeEnum } from '../../workflows/domain/value-objects';

export interface EscalationSignals {
  aiConfidence?: number;
  sentimentScore?: number;
  humanRequested?: boolean;
  priorityRequested?: boolean;
  workflowId?: string;
}

const CONFIDENCE_THRESHOLD = parseFloat(
  process.env.TICKET_AI_CONFIDENCE_THRESHOLD || '0.6',
);
const NEGATIVE_SENTIMENT_THRESHOLD = parseFloat(
  process.env.TICKET_NEGATIVE_SENTIMENT_THRESHOLD || '-0.3',
);

/**
 * Evaluates escalation rules and applies escalations. This module only wires
 * integration signals (AI confidence, sentiment, human-request, workflow) into
 * ticket state — it contains no AI logic of its own.
 */
@Injectable()
export class TicketEscalationService {
  private readonly logger = new Logger(TicketEscalationService.name);

  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly queueService: QueueService,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => WorkflowEngineService))
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  private async getOrThrow(tenantId: string, id: string): Promise<Ticket> {
    const ticket = await this.ticketRepo.findById(id, tenantId);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  /**
   * Applies the configured escalation rules to a set of integration signals and
   * enqueues escalation work when any rule fires.
   */
  async evaluate(
    tenantId: string,
    ticketId: string,
    signals: EscalationSignals,
  ): Promise<{ escalated: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    if (
      signals.aiConfidence !== undefined &&
      signals.aiConfidence < CONFIDENCE_THRESHOLD
    ) {
      reasons.push('AI_LOW_CONFIDENCE');
    }
    if (
      signals.sentimentScore !== undefined &&
      signals.sentimentScore <= NEGATIVE_SENTIMENT_THRESHOLD
    ) {
      reasons.push('NEGATIVE_SENTIMENT');
    }
    if (signals.humanRequested) reasons.push('HUMAN_REQUESTED');
    if (signals.priorityRequested) reasons.push('PRIORITY');
    if (signals.workflowId) reasons.push('WORKFLOW');

    if (reasons.length === 0) {
      return { escalated: false, reasons };
    }

    await this.queueService.addJob(QUEUES.TICKET, 'ticket-escalation-job', {
      ticketId,
      tenantId,
      reason: reasons.join(','),
      workflowId: signals.workflowId,
    });

    return { escalated: true, reasons };
  }

  /**
   * Worker path: bumps priority, records an escalation assignment and, when a
   * workflow is referenced, hands off to the workflow platform via the queue.
   */
  async escalate(
    tenantId: string,
    ticketId: string,
    reason: string,
    options: { workflowId?: string; userId?: string } = {},
  ): Promise<Ticket> {
    const ticket = await this.getOrThrow(tenantId, ticketId);
    ticket.escalate(reason);

    await this.ticketRepo.save(ticket, tenantId);
    await this.eventPublisher.publishAll(ticket.domainEvents);
    ticket.clearEvents();

    await this.ticketRepo.addAssignment(
      new TicketAssignment(randomUUID(), {
        tenantId,
        ticketId,
        agentId: ticket.assignedAgentId,
        teamId: ticket.assignedTeamId,
        assignmentType: 'ESCALATION',
        assignedBy: options.userId,
      }),
      tenantId,
    );

    if (options.workflowId) {
      await this.queueService.addJob(QUEUES.WORKFLOW, 'run-workflow', {
        trigger: 'TICKET_ESCALATION',
        workflowId: options.workflowId,
        ticketId,
        tenantId,
      });
    }

    await this.auditService.log({
      tenantId,
      userId: options.userId,
      action: 'TICKET_ESCALATE',
      details: `Escalated ticket ${ticketId} (${reason}) to ${ticket.priority.value}`,
    });

    try {
      await this.workflowEngineService.evaluateEventTriggers(
        tenantId,
        TriggerTypeEnum.TICKET_ESCALATED,
        {
          id: ticket.id,
          ticketId: ticket.id,
          reason,
          status: ticket.status.value,
          priority: ticket.priority.value,
          customerId: ticket.customerId,
          conversationId: ticket.conversationId,
        },
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to evaluate workflow triggers for TICKET_ESCALATED: ${err.message}`,
      );
    }

    return ticket;
  }
}
