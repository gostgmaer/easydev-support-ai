import { Entity } from '@easydev/shared-kernel';

export interface ConversationParticipantProps {
  tenantId: string;
  conversationId: string;
  participantId: string;
  participantType: string; // CUSTOMER, AGENT, BOT, OBSERVER
  joinedAt?: Date;
  leftAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConversationParticipant extends Entity<string> {
  private props: ConversationParticipantProps;

  constructor(id: string, props: ConversationParticipantProps) {
    super(id);
    this.props = {
      ...props,
      joinedAt: props.joinedAt || new Date(),
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
  get participantId(): string {
    return this.props.participantId;
  }
  get participantType(): string {
    return this.props.participantType;
  }
  get joinedAt(): Date {
    return this.props.joinedAt!;
  }
  get leftAt(): Date | undefined {
    return this.props.leftAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public leave(): void {
    this.props.leftAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      participantId: this.participantId,
      participantType: this.participantType,
      joinedAt: this.joinedAt,
      leftAt: this.leftAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
