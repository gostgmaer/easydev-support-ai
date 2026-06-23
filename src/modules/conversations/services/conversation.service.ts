import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IConversationRepository,
  ConversationQueryOptions,
} from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationParticipant } from '../domain/conversation-participant.entity';
import {
  ConversationStatus,
  ConversationStatusEnum,
  ConversationPriority,
  ConversationPriorityEnum,
  ConversationLanguage,
  ConversationSentiment,
  ConversationSentimentEnum,
  ConversationSource,
} from '../domain/value-objects';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationQueryDto,
} from '../dtos';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { ConversationSummaryService } from './conversation-summary.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';
import { UsageLimitService } from '../../settings/services/usage-limit.service';

@Injectable()
export class ConversationService {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    private readonly eventPublisher: ConversationEventPublisher,
    private readonly summaryService: ConversationSummaryService,
    private readonly customerService: CustomerService,
    private readonly auditService: AuditService,
    private readonly usageLimitService: UsageLimitService,
  ) {}

  private async persist(
    conversation: Conversation,
    tenantId: string,
  ): Promise<void> {
    await this.conversationRepo.save(conversation, tenantId);
    await this.summaryService.rebuild(tenantId, conversation.id);
    await this.eventPublisher.publishAll(conversation.domainEvents);
    conversation.clearEvents();
  }

  async create(
    tenantId: string,
    dto: CreateConversationDto,
    userId?: string,
  ): Promise<Conversation> {
    // Integrate with Customer Module: the customer must exist for this tenant.
    await this.customerService.findById(tenantId, dto.customerId);

    // UsageLimits stored a maxConversations ceiling per plan but nothing
    // ever checked it before creating a new conversation - any tenant could
    // exceed every plan limit with zero rejection.
    const { total: currentConversations } =
      await this.conversationRepo.findPaginated(tenantId, { limit: 1 });
    await this.usageLimitService.enforceLimit(
      tenantId,
      'conversations',
      currentConversations,
    );

    const conversationId = randomUUID();
    const initialStatus = dto.assignedAgentId
      ? ConversationStatusEnum.ASSIGNED
      : ConversationStatusEnum.OPEN;

    const conversation = Conversation.create(conversationId, {
      tenantId,
      customerId: dto.customerId,
      channelId: dto.channelId,
      assignedAgentId: dto.assignedAgentId,
      assignedTeamId: dto.assignedTeamId,
      status: ConversationStatus.create(initialStatus),
      priority: ConversationPriority.create(
        dto.priority || ConversationPriorityEnum.MEDIUM,
      ),
      subject: dto.subject,
      language: ConversationLanguage.create(dto.language || 'en'),
      sentiment: ConversationSentiment.create(
        ConversationSentimentEnum.NEUTRAL,
      ),
      source: ConversationSource.create(dto.source || 'API'),
      metadata: dto.metadata || {},
    });

    conversation.addParticipant(
      new ConversationParticipant(randomUUID(), {
        tenantId,
        conversationId,
        participantId: dto.customerId,
        participantType: 'CUSTOMER',
      }),
    );

    await this.persist(conversation, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_CREATE',
      details: `Created conversation ${conversationId} for customer ${dto.customerId}`,
    });

    return conversation;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateConversationDto,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, id);

    const updateProps: Parameters<Conversation['update']>[0] = {};
    if (dto.status !== undefined)
      updateProps.status = ConversationStatus.create(dto.status);
    if (dto.priority !== undefined)
      updateProps.priority = ConversationPriority.create(dto.priority);
    if (dto.subject !== undefined) updateProps.subject = dto.subject;
    if (dto.language !== undefined)
      updateProps.language = ConversationLanguage.create(dto.language);
    if (dto.sentiment !== undefined)
      updateProps.sentiment = ConversationSentiment.create(dto.sentiment);
    if (dto.assignedTeamId !== undefined)
      updateProps.assignedTeamId = dto.assignedTeamId;
    if (dto.metadata !== undefined) updateProps.metadata = dto.metadata;

    conversation.update(updateProps);
    await this.persist(conversation, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_UPDATE',
      details: `Updated conversation ${id}`,
    });

    return conversation;
  }

  async resolve(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, id);
    conversation.resolve(userId);
    await this.persist(conversation, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_RESOLVE',
      details: `Resolved conversation ${id}`,
    });
    return conversation;
  }

  async close(
    tenantId: string,
    id: string,
    reason?: string,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, id);
    conversation.close(reason);
    await this.persist(conversation, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_CLOSE',
      details: `Closed conversation ${id}`,
    });
    return conversation;
  }

  async archive(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getOrThrow(tenantId, id);
    conversation.archive();
    await this.persist(conversation, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_ARCHIVE',
      details: `Archived conversation ${id}`,
    });
    return conversation;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const conversation = await this.getOrThrow(tenantId, id);
    conversation.softDelete();
    await this.conversationRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_DELETE',
      details: `Soft deleted conversation ${id}`,
    });
    return true;
  }

  async findById(tenantId: string, id: string): Promise<Conversation> {
    return this.getOrThrow(tenantId, id);
  }

  async findPaginated(tenantId: string, query: ConversationQueryDto) {
    return this.conversationRepo.findPaginated(tenantId, query);
  }

  async merge(
    tenantId: string,
    sourceId: string,
    targetId: string,
    userId?: string,
  ): Promise<Conversation> {
    const source = await this.getOrThrow(tenantId, sourceId);
    const target = await this.getOrThrow(tenantId, targetId);

    target.update({
      metadata: {
        ...(target.metadata || {}),
        mergedConversationIds: [
          ...(((target.metadata || {}).mergedConversationIds as string[]) ||
            []),
          sourceId,
        ],
      },
    });
    source.update({
      metadata: { ...(source.metadata || {}), mergedInto: targetId },
    });
    source.archive();

    await this.persist(target, tenantId);
    await this.persist(source, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_MERGE',
      details: `Merged conversation ${sourceId} into ${targetId}`,
    });

    return target;
  }

  async split(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<Conversation> {
    const origin = await this.getOrThrow(tenantId, id);

    const newId = randomUUID();
    const newConversation = Conversation.create(newId, {
      tenantId,
      customerId: origin.customerId,
      channelId: origin.channelId,
      status: ConversationStatus.create(ConversationStatusEnum.OPEN),
      priority: ConversationPriority.create(origin.priority.value),
      subject: origin.subject ? `${origin.subject} (split)` : undefined,
      language: ConversationLanguage.create(origin.language.value),
      sentiment: ConversationSentiment.create(origin.sentiment.value),
      source: ConversationSource.create(origin.source.value),
      metadata: { splitFrom: id },
    });

    await this.persist(newConversation, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_SPLIT',
      details: `Split conversation ${id} into ${newId}`,
    });

    return newConversation;
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
}
