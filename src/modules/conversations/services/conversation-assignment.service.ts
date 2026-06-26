import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationAssignment } from '../domain/conversation-assignment.entity';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { ConversationSummaryService } from './conversation-summary.service';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import type { IAgentAvailabilityRepository } from '../../teams/repositories/agent-availability-repository.interface';
import { AuditService } from '../../audit/audit.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';

const ACTIVE_CONVERSATION_STATUSES = [
  'OPEN',
  'PENDING',
  'ASSIGNED',
  'WAITING_CUSTOMER',
  'WAITING_AGENT',
];

@Injectable()
export class ConversationAssignmentService {
  private readonly logger = new Logger(ConversationAssignmentService.name);

  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    private readonly agentAssignmentService: AgentAssignmentService,
    @Inject('IAgentAvailabilityRepository')
    private readonly availabilityRepo: IAgentAvailabilityRepository,
    private readonly eventPublisher: ConversationEventPublisher,
    private readonly summaryService: ConversationSummaryService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  private async notifyAssignedAgent(
    tenantId: string,
    agentId: string,
    conversationId: string,
  ): Promise<void> {
    try {
      await this.queueService.addJob(
        QUEUES.NOTIFICATION,
        'conversation-assigned',
        { tenantId, agentId, conversationId },
      );
    } catch {
      // notification is best-effort; assignment itself already succeeded
    }
  }

  private async persist(
    conversation: Conversation,
    tenantId: string,
  ): Promise<void> {
    await this.conversationRepo.save(conversation, tenantId);
    await this.summaryService.rebuild(tenantId, conversation.id);
    await this.eventPublisher.publishAll(conversation.domainEvents);
    conversation.clearEvents();
  }

  private async recordAssignment(
    tenantId: string,
    conversationId: string,
    agentProfileId: string | undefined,
    teamId: string | undefined,
    assignmentType: string,
    assignedBy?: string,
  ): Promise<void> {
    await this.conversationRepo.addAssignment(
      new ConversationAssignment(randomUUID(), {
        tenantId,
        conversationId,
        agentProfileId,
        teamId,
        assignmentType,
        assignedBy,
      }),
      tenantId,
    );
  }

  private async getOrThrow(
    tenantId: string,
    id: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findById(id, tenantId);
    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return conversation;
  }

  async assign(
    tenantId: string,
    conversationId: string,
    agentProfileId: string,
    teamId?: string,
    assignmentType = 'MANUAL',
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, conversationId);
    conversation.assignAgent(agentProfileId, teamId, userId);

    await this.persist(conversation, tenantId);
    await this.recordAssignment(
      tenantId,
      conversationId,
      agentProfileId,
      teamId,
      assignmentType,
      userId,
    );

    await this.notifyAssignedAgent(tenantId, agentProfileId, conversationId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_ASSIGN',
      details: `Assigned conversation ${conversationId} to agent ${agentProfileId} (${assignmentType})`,
    });

    return conversation;
  }

  /**
   * Delegates agent selection to the Team Module assignment engine
   * (round-robin / least-loaded / skill-based / priority-based / fallback),
   * then binds the chosen agent to the conversation.
   */
  async autoAssign(
    tenantId: string,
    conversationId: string,
    teamId: string,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, conversationId);

    const agentProfileId = await this.agentAssignmentService.assignEntity(
      tenantId,
      teamId,
      conversationId,
      'CONVERSATION',
      { priority: conversation.priority.weight },
    );

    return this.assign(
      tenantId,
      conversationId,
      agentProfileId,
      teamId,
      'AUTO',
      userId,
    );
  }

  async transfer(
    tenantId: string,
    conversationId: string,
    toAgentProfileId: string,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, conversationId);
    conversation.transfer(toAgentProfileId, userId);

    await this.persist(conversation, tenantId);
    await this.recordAssignment(
      tenantId,
      conversationId,
      toAgentProfileId,
      conversation.assignedTeamId,
      'TRANSFER',
      userId,
    );

    await this.notifyAssignedAgent(tenantId, toAgentProfileId, conversationId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_TRANSFER',
      details: `Transferred conversation ${conversationId} to agent ${toAgentProfileId}`,
    });

    return conversation;
  }

  async listAssignments(tenantId: string, conversationId: string) {
    return this.conversationRepo.findAssignments(conversationId, tenantId);
  }

  /**
   * No conversation was ever automatically reassigned when its agent went
   * offline - it just sat assigned to someone who would never see it again.
   * AgentAvailability (status field) is the canonical "is this agent online"
   * source the auto-assignment engine itself already trusts; this reuses
   * the exact same engine rather than inventing new selection logic.
   */
  async reassignFromOfflineAgents(
    tenantId?: string,
  ): Promise<{ reassigned: number; skipped: number }> {
    const offlineAgents =
      await this.availabilityRepo.findOfflineAgents(tenantId);
    let reassigned = 0;
    let skipped = 0;

    for (const agent of offlineAgents) {
      const { data: assigned } = await this.conversationRepo.findPaginated(
        agent.tenantId,
        { assignedAgentId: agent.agentProfileId, limit: 200 },
      );

      for (const conversation of assigned) {
        if (!ACTIVE_CONVERSATION_STATUSES.includes(conversation.status.value)) {
          continue;
        }
        if (!conversation.assignedTeamId) {
          this.logger.warn(
            `Conversation ${conversation.id} is assigned to offline agent ${agent.agentProfileId} with no team to reassign within - skipping`,
          );
          skipped += 1;
          continue;
        }
        try {
          await this.autoAssign(
            agent.tenantId,
            conversation.id,
            conversation.assignedTeamId,
          );
          reassigned += 1;
        } catch (err: any) {
          this.logger.warn(
            `Failed to reassign conversation ${conversation.id} away from offline agent ${agent.agentProfileId}: ${err.message}`,
          );
          skipped += 1;
        }
      }
    }

    return { reassigned, skipped };
  }
}
