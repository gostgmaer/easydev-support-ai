import { AggregateRoot } from '@easydev/shared-kernel';
import {
  InboxStatus,
  InboxStatusEnum,
  InboxPriorityEnum,
} from './value-objects';
import { InboxUpdatedEvent } from '@easydev/shared-events';

export interface InboxViewProps {
  tenantId: string;
  conversationId: string;
  customerId?: string;
  channelId?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  status: InboxStatus;
  priority: InboxPriorityEnum;
  sentiment?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageType?: string;
  unreadCount?: number;
  openTicketCount?: number;
  aiConfidenceScore?: number;
  waitingSince?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
}

/**
 * Read-optimized projection of a conversation tailored for the agent inbox. It
 * is never the source of truth — it is rebuilt from domain events emitted by the
 * Conversation, Message, Ticket and AI modules.
 */
export class InboxView extends AggregateRoot<string> {
  private props: InboxViewProps;

  constructor(id: string, props: InboxViewProps) {
    super(id);
    this.props = {
      ...props,
      unreadCount: props.unreadCount ?? 0,
      openTicketCount: props.openTicketCount ?? 0,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get customerId(): string | undefined {
    return this.props.customerId;
  }
  get channelId(): string | undefined {
    return this.props.channelId;
  }
  get assignedAgentId(): string | undefined {
    return this.props.assignedAgentId;
  }
  get assignedTeamId(): string | undefined {
    return this.props.assignedTeamId;
  }
  get status(): InboxStatus {
    return this.props.status;
  }
  get priority(): InboxPriorityEnum {
    return this.props.priority;
  }
  get sentiment(): string | undefined {
    return this.props.sentiment;
  }
  get lastMessage(): string | undefined {
    return this.props.lastMessage;
  }
  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }
  get lastMessageType(): string | undefined {
    return this.props.lastMessageType;
  }
  get unreadCount(): number {
    return this.props.unreadCount ?? 0;
  }
  get openTicketCount(): number {
    return this.props.openTicketCount ?? 0;
  }
  get aiConfidenceScore(): number | undefined {
    return this.props.aiConfidenceScore;
  }
  get waitingSince(): Date | undefined {
    return this.props.waitingSince;
  }
  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: Omit<InboxViewProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): InboxView {
    const view = new InboxView(id, props);
    view.emitUpdated();
    return view;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  private emitUpdated(): void {
    this.addDomainEvent(
      new InboxUpdatedEvent(
        this.tenantId,
        this.conversationId,
        this.status.value,
      ),
    );
  }

  public applyConversationUpdate(props: {
    status?: InboxStatusEnum;
    priority?: InboxPriorityEnum;
    customerId?: string;
    channelId?: string;
    assignedAgentId?: string;
    assignedTeamId?: string;
  }): void {
    if (props.status) this.props.status = InboxStatus.create(props.status);
    if (props.priority) this.props.priority = props.priority;
    if (props.customerId !== undefined)
      this.props.customerId = props.customerId;
    if (props.channelId !== undefined) this.props.channelId = props.channelId;
    if (props.assignedAgentId !== undefined)
      this.props.assignedAgentId = props.assignedAgentId;
    if (props.assignedTeamId !== undefined)
      this.props.assignedTeamId = props.assignedTeamId;
    this.touch();
    this.emitUpdated();
  }

  public applyMessage(props: {
    content?: string;
    at?: Date;
    type?: string;
    direction: 'INBOUND' | 'OUTBOUND';
  }): void {
    this.props.lastMessage = props.content;
    this.props.lastMessageAt = props.at || new Date();
    this.props.lastMessageType = props.type;
    if (props.direction === 'INBOUND') {
      this.props.unreadCount = (this.props.unreadCount ?? 0) + 1;
      this.props.waitingSince = this.props.waitingSince || new Date();
    } else {
      this.props.unreadCount = 0;
      this.props.waitingSince = undefined;
    }
    this.touch();
    this.emitUpdated();
  }

  public assign(agentId?: string, teamId?: string): void {
    this.props.assignedAgentId = agentId;
    this.props.assignedTeamId = teamId;
    this.touch();
    this.emitUpdated();
  }

  public unassign(): void {
    this.props.assignedAgentId = undefined;
    this.props.assignedTeamId = undefined;
    this.touch();
    this.emitUpdated();
  }

  public snooze(): void {
    this.props.status = InboxStatus.create(InboxStatusEnum.SNOOZED);
    this.touch();
    this.emitUpdated();
  }

  public unsnooze(): void {
    if (this.props.status.value === InboxStatusEnum.SNOOZED) {
      this.props.status = InboxStatus.create(InboxStatusEnum.OPEN);
      this.touch();
      this.emitUpdated();
    }
  }

  public resolve(): void {
    this.props.status = InboxStatus.create(InboxStatusEnum.RESOLVED);
    this.props.waitingSince = undefined;
    this.touch();
    this.emitUpdated();
  }

  public archive(): void {
    this.props.status = InboxStatus.create(InboxStatusEnum.ARCHIVED);
    this.touch();
    this.emitUpdated();
  }

  public setSentiment(sentiment: string): void {
    this.props.sentiment = sentiment;
    this.touch();
  }

  public setAiConfidence(score: number): void {
    this.props.aiConfidenceScore = score;
    this.touch();
  }

  public setOpenTicketCount(count: number): void {
    this.props.openTicketCount = count;
    this.touch();
    this.emitUpdated();
  }

  public markRead(): void {
    this.props.unreadCount = 0;
    this.props.waitingSince = undefined;
    this.touch();
  }

  public setMetadata(metadata: Record<string, any>): void {
    this.props.metadata = { ...(this.props.metadata || {}), ...metadata };
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      customerId: this.customerId,
      channelId: this.channelId,
      assignedAgentId: this.assignedAgentId,
      assignedTeamId: this.assignedTeamId,
      status: this.status.value,
      priority: this.priority,
      sentiment: this.sentiment,
      lastMessage: this.lastMessage,
      lastMessageAt: this.lastMessageAt,
      lastMessageType: this.lastMessageType,
      unreadCount: this.unreadCount,
      openTicketCount: this.openTicketCount,
      aiConfidenceScore: this.aiConfidenceScore,
      waitingSince: this.waitingSince,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
