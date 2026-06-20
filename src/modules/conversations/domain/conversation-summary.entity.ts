import { Entity } from '@easydev/shared-kernel';

export interface ConversationSummaryProps {
  tenantId: string;
  conversationId: string;
  customerName?: string;
  customerAvatar?: string;
  lastMessage?: string;
  lastMessageType?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  totalMessages: number;
  totalAttachments: number;
  sentimentScore: number;
  priority?: string;
  status?: string;
  assignedAgentName?: string;
  assignedTeamName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationSummary extends Entity<string> {
  private props: ConversationSummaryProps;

  constructor(id: string, props: ConversationSummaryProps) {
    super(id);
    this.props = {
      ...props,
      unreadCount: props.unreadCount ?? 0,
      totalMessages: props.totalMessages ?? 0,
      totalAttachments: props.totalAttachments ?? 0,
      sentimentScore: props.sentimentScore ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get conversationId(): string {
    return this.props.conversationId;
  }
  get customerName(): string | undefined {
    return this.props.customerName;
  }
  get customerAvatar(): string | undefined {
    return this.props.customerAvatar;
  }
  get lastMessage(): string | undefined {
    return this.props.lastMessage;
  }
  get lastMessageType(): string | undefined {
    return this.props.lastMessageType;
  }
  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }
  get unreadCount(): number {
    return this.props.unreadCount;
  }
  get totalMessages(): number {
    return this.props.totalMessages;
  }
  get totalAttachments(): number {
    return this.props.totalAttachments;
  }
  get sentimentScore(): number {
    return this.props.sentimentScore;
  }
  get priority(): string | undefined {
    return this.props.priority;
  }
  get status(): string | undefined {
    return this.props.status;
  }
  get assignedAgentName(): string | undefined {
    return this.props.assignedAgentName;
  }
  get assignedTeamName(): string | undefined {
    return this.props.assignedTeamName;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public update(
    props: Partial<
      Omit<
        ConversationSummaryProps,
        'tenantId' | 'conversationId' | 'createdAt'
      >
    >,
  ): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public incrementUnread(by = 1): void {
    this.props.unreadCount += by;
    this.props.updatedAt = new Date();
  }

  public resetUnread(): void {
    this.props.unreadCount = 0;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      customerName: this.customerName,
      customerAvatar: this.customerAvatar,
      lastMessage: this.lastMessage,
      lastMessageType: this.lastMessageType,
      lastMessageAt: this.lastMessageAt,
      unreadCount: this.unreadCount,
      totalMessages: this.totalMessages,
      totalAttachments: this.totalAttachments,
      sentimentScore: this.sentimentScore,
      priority: this.priority,
      status: this.status,
      assignedAgentName: this.assignedAgentName,
      assignedTeamName: this.assignedTeamName,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
