import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationAssignment } from '../domain/conversation-assignment.entity';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { ConversationSummaryService } from './conversation-summary.service';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ConversationAssignmentService {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    private readonly agentAssignmentService: AgentAssignmentService,
    private readonly eventPublisher: ConversationEventPublisher,
    private readonly summaryService: ConversationSummaryService,
    private readonly auditService: AuditService,
  ) {}

  private async persist(conversation: Conversation, tenantId: string): Promise<void> {
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

  private async getOrThrow(tenantId: string, id: string): Promise<Conversation> {
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
    await this.recordAssignment(tenantId, conversationId, agentProfileId, teamId, assignmentType, userId);

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
  async autoAssign(tenantId: string, conversationId: string, teamId: string, userId?: string): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, conversationId);

    const agentProfileId = await this.agentAssignmentService.assignEntity(
      tenantId,
      teamId,
      conversationId,
      'CONVERSATION',
      { priority: conversation.priority.weight },
    );

    return this.assign(tenantId, conversationId, agentProfileId, teamId, 'AUTO', userId);
  }

  async transfer(tenantId: string, conversationId: string, toAgentProfileId: string, userId?: string): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, conversationId);
    conversation.transfer(toAgentProfileId, userId);

    await this.persist(conversation, tenantId);
    await this.recordAssignment(tenantId, conversationId, toAgentProfileId, conversation.assignedTeamId, 'TRANSFER', userId);

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
}
