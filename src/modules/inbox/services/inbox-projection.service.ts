import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { InboxView } from '../domain/inbox-view.aggregate';
import {
  InboxStatus,
  InboxStatusEnum,
  InboxPriorityEnum,
} from '../domain/value-objects';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxRealtimeService } from './inbox-realtime.service';

export interface ConversationProjection {
  conversationId: string;
  customerId?: string;
  channelId?: string;
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
}

export interface MessageProjection {
  conversationId: string;
  content?: string;
  at?: Date;
  type?: string;
  direction: 'INBOUND' | 'OUTBOUND';
}

const STATUS_MAP: Record<string, InboxStatusEnum> = {
  OPEN: InboxStatusEnum.OPEN,
  ACTIVE: InboxStatusEnum.OPEN,
  PENDING: InboxStatusEnum.PENDING,
  WAITING_CUSTOMER: InboxStatusEnum.WAITING_CUSTOMER,
  WAITING_AGENT: InboxStatusEnum.WAITING_AGENT,
  WAITING_INTERNAL: InboxStatusEnum.WAITING_AGENT,
  SNOOZED: InboxStatusEnum.SNOOZED,
  RESOLVED: InboxStatusEnum.RESOLVED,
  CLOSED: InboxStatusEnum.RESOLVED,
  ARCHIVED: InboxStatusEnum.ARCHIVED,
};

const PRIORITY_MAP: Record<string, InboxPriorityEnum> = {
  LOW: InboxPriorityEnum.LOW,
  MEDIUM: InboxPriorityEnum.MEDIUM,
  NORMAL: InboxPriorityEnum.MEDIUM,
  HIGH: InboxPriorityEnum.HIGH,
  URGENT: InboxPriorityEnum.URGENT,
  CRITICAL: InboxPriorityEnum.URGENT,
};

/**
 * Projection engine that materializes the agent-facing inbox_views table from
 * domain events of the Conversation, Message, Ticket, Customer and AI modules.
 * The inbox never reads raw message/conversation tables for listing.
 */
@Injectable()
export class InboxProjectionService {
  private readonly logger = new Logger(InboxProjectionService.name);

  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly realtime: InboxRealtimeService,
  ) {}

  private mapStatus(status?: string): InboxStatusEnum | undefined {
    if (!status) return undefined;
    return STATUS_MAP[status.toUpperCase()];
  }

  private mapPriority(priority?: string): InboxPriorityEnum | undefined {
    if (!priority) return undefined;
    return PRIORITY_MAP[priority.toUpperCase()];
  }

  private async getOrCreate(
    tenantId: string,
    conversationId: string,
    seed: Partial<ConversationProjection> = {},
  ): Promise<InboxView> {
    const existing = await this.inboxRepo.findViewByConversation(
      tenantId,
      conversationId,
    );
    if (existing) return existing;
    return InboxView.create(randomUUID(), {
      tenantId,
      conversationId,
      customerId: seed.customerId,
      channelId: seed.channelId,
      assignedAgentId: seed.assignedAgentId,
      assignedTeamId: seed.assignedTeamId,
      status: InboxStatus.create(
        this.mapStatus(seed.status) || InboxStatusEnum.OPEN,
      ),
      priority: this.mapPriority(seed.priority) || InboxPriorityEnum.MEDIUM,
    });
  }

  private async persist(view: InboxView, tenantId: string): Promise<void> {
    await this.inboxRepo.saveView(view, tenantId);
    await this.eventPublisher.publishAll(view.domainEvents);
    view.clearEvents();
    await this.realtime.emitConversationUpdate(tenantId, view.toJSON());
  }

  async projectConversation(
    tenantId: string,
    projection: ConversationProjection,
  ): Promise<void> {
    const view = await this.getOrCreate(
      tenantId,
      projection.conversationId,
      projection,
    );
    view.applyConversationUpdate({
      status: this.mapStatus(projection.status),
      priority: this.mapPriority(projection.priority),
      customerId: projection.customerId,
      channelId: projection.channelId,
      assignedAgentId: projection.assignedAgentId,
      assignedTeamId: projection.assignedTeamId,
    });
    await this.persist(view, tenantId);
  }

  async projectMessage(
    tenantId: string,
    projection: MessageProjection,
  ): Promise<void> {
    const view = await this.getOrCreate(tenantId, projection.conversationId);
    view.applyMessage({
      content: projection.content,
      at: projection.at,
      type: projection.type,
      direction: projection.direction,
    });
    await this.inboxRepo.saveView(view, tenantId);
    await this.eventPublisher.publishAll(view.domainEvents);
    view.clearEvents();
    await this.realtime.emitMessageUpdate(tenantId, view.toJSON());
  }

  async adjustOpenTicketCount(
    tenantId: string,
    conversationId: string,
    delta: number,
  ): Promise<void> {
    const view = await this.getOrCreate(tenantId, conversationId);
    const next = Math.max(0, view.openTicketCount + delta);
    view.setOpenTicketCount(next);
    await this.persist(view, tenantId);
  }

  async projectCustomer(
    tenantId: string,
    conversationId: string,
    customerId: string,
  ): Promise<void> {
    const view = await this.getOrCreate(tenantId, conversationId);
    view.applyConversationUpdate({ customerId });
    await this.persist(view, tenantId);
  }

  async projectAiSignals(
    tenantId: string,
    conversationId: string,
    signals: {
      sentiment?: string;
      aiConfidenceScore?: number;
      escalated?: boolean;
    },
  ): Promise<void> {
    const view = await this.getOrCreate(tenantId, conversationId);
    if (signals.sentiment) view.setSentiment(signals.sentiment);
    if (signals.aiConfidenceScore !== undefined)
      view.setAiConfidence(signals.aiConfidenceScore);
    if (signals.escalated) view.setMetadata({ aiEscalated: true });
    await this.persist(view, tenantId);
  }

  async markSlaRisk(
    tenantId: string,
    conversationId: string,
    atRisk: boolean,
  ): Promise<void> {
    const view = await this.getOrCreate(tenantId, conversationId);
    view.setMetadata({ slaRisk: atRisk });
    await this.persist(view, tenantId);
  }
}
