import { AggregateRoot } from '@easydev/shared-kernel';
import {
  ConversationStatus,
  ConversationStatusEnum,
  ConversationPriority,
  ConversationPriorityEnum,
  ConversationLanguage,
  ConversationSentiment,
  ConversationSentimentEnum,
  ConversationSource,
} from './value-objects';
import { ConversationTag } from './conversation-tag.entity';
import { ConversationNote } from './conversation-note.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { ConversationMention } from './conversation-mention.entity';
import {
  ConversationCreatedEvent,
  ConversationUpdatedEvent,
  ConversationAssignedEvent,
  ConversationTransferredEvent,
  ConversationTaggedEvent,
  ConversationNoteAddedEvent,
  ConversationResolvedEvent,
  ConversationClosedEvent,
  ConversationArchivedEvent,
} from '@easydev/shared-events';

export interface ConversationProps {
  tenantId: string;
  customerId: string;
  channelId?: string;
  assignedAgentId?: string;
  assignedTeamId?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  subject?: string;
  language: ConversationLanguage;
  sentiment: ConversationSentiment;
  source: ConversationSource;
  lastMessageAt?: Date;
  lastActivityAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  tags?: ConversationTag[];
  notes?: ConversationNote[];
  participants?: ConversationParticipant[];
  mentions?: ConversationMention[];
}

export class Conversation extends AggregateRoot<string> {
  private props: ConversationProps;

  constructor(id: string, props: ConversationProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      lastActivityAt: props.lastActivityAt || props.createdAt || new Date(),
      version: props.version || 1,
      tags: props.tags || [],
      notes: props.notes || [],
      participants: props.participants || [],
      mentions: props.mentions || [],
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get customerId(): string {
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
  get status(): ConversationStatus {
    return this.props.status;
  }
  get priority(): ConversationPriority {
    return this.props.priority;
  }
  get subject(): string | undefined {
    return this.props.subject;
  }
  get language(): ConversationLanguage {
    return this.props.language;
  }
  get sentiment(): ConversationSentiment {
    return this.props.sentiment;
  }
  get source(): ConversationSource {
    return this.props.source;
  }
  get lastMessageAt(): Date | undefined {
    return this.props.lastMessageAt;
  }
  get lastActivityAt(): Date | undefined {
    return this.props.lastActivityAt;
  }
  get firstResponseAt(): Date | undefined {
    return this.props.firstResponseAt;
  }
  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }
  get closedAt(): Date | undefined {
    return this.props.closedAt;
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
    return this.props.version!;
  }
  get tags(): ConversationTag[] {
    return this.props.tags!;
  }
  get notes(): ConversationNote[] {
    return this.props.notes!;
  }
  get participants(): ConversationParticipant[] {
    return this.props.participants!;
  }
  get mentions(): ConversationMention[] {
    return this.props.mentions!;
  }

  public static create(
    id: string,
    props: Omit<ConversationProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): Conversation {
    const conversation = new Conversation(id, props);
    conversation.addDomainEvent(
      new ConversationCreatedEvent(
        conversation.tenantId,
        conversation.id,
        conversation.customerId,
        conversation.channelId || '',
      ),
    );
    return conversation;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
    this.props.lastActivityAt = new Date();
    this.props.version = this.props.version! + 1;
  }

  public update(
    props: Partial<
      Pick<
        ConversationProps,
        | 'status'
        | 'priority'
        | 'subject'
        | 'language'
        | 'sentiment'
        | 'assignedTeamId'
        | 'metadata'
        | 'lastMessageAt'
      >
    >,
  ): void {
    this.props = { ...this.props, ...props };
    this.touch();
    this.addDomainEvent(
      new ConversationUpdatedEvent(
        this.tenantId,
        this.id,
        this.status.value,
        this.priority.value,
      ),
    );
  }

  public markFirstResponse(): void {
    if (!this.props.firstResponseAt) {
      this.props.firstResponseAt = new Date();
      this.touch();
    }
  }

  public assignAgent(
    agentProfileId: string,
    teamId: string | undefined,
    assignedBy?: string,
  ): void {
    this.props.assignedAgentId = agentProfileId;
    if (teamId) this.props.assignedTeamId = teamId;
    this.props.status = ConversationStatus.create(
      ConversationStatusEnum.ASSIGNED,
    );
    this.touch();
    this.addDomainEvent(
      new ConversationAssignedEvent(this.tenantId, this.id, agentProfileId),
    );
  }

  public transfer(toAgentProfileId: string, assignedBy?: string): void {
    const fromAgentId = this.props.assignedAgentId;
    this.props.assignedAgentId = toAgentProfileId;
    this.props.status = ConversationStatus.create(
      ConversationStatusEnum.ASSIGNED,
    );
    this.touch();
    this.addDomainEvent(
      new ConversationTransferredEvent(
        this.tenantId,
        this.id,
        fromAgentId,
        toAgentProfileId,
      ),
    );
  }

  public assignTeam(teamId: string): void {
    this.props.assignedTeamId = teamId;
    this.touch();
  }

  public resolve(resolvedBy?: string): void {
    this.props.status = ConversationStatus.create(
      ConversationStatusEnum.RESOLVED,
    );
    this.props.resolvedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new ConversationResolvedEvent(this.tenantId, this.id, resolvedBy),
    );
  }

  public close(reason?: string): void {
    this.props.status = ConversationStatus.create(
      ConversationStatusEnum.CLOSED,
    );
    this.props.closedAt = new Date();
    this.touch();
    this.addDomainEvent(
      new ConversationClosedEvent(this.tenantId, this.id, reason),
    );
  }

  public archive(): void {
    this.props.status = ConversationStatus.create(
      ConversationStatusEnum.ARCHIVED,
    );
    this.touch();
    this.addDomainEvent(new ConversationArchivedEvent(this.tenantId, this.id));
  }

  public addTag(tag: ConversationTag): void {
    if (this.props.tags!.some((t) => t.tag === tag.tag)) {
      return;
    }
    this.props.tags!.push(tag);
    this.touch();
    this.addDomainEvent(
      new ConversationTaggedEvent(this.tenantId, this.id, tag.tag),
    );
  }

  public removeTag(tagValue: string): void {
    this.props.tags = this.props.tags!.filter((t) => t.tag !== tagValue);
    this.touch();
  }

  public addNote(note: ConversationNote): void {
    this.props.notes!.push(note);
    this.touch();
    this.addDomainEvent(
      new ConversationNoteAddedEvent(
        this.tenantId,
        this.id,
        note.id,
        note.authorId,
      ),
    );
  }

  public addParticipant(participant: ConversationParticipant): void {
    if (
      this.props.participants!.some(
        (p) => p.participantId === participant.participantId,
      )
    ) {
      return;
    }
    this.props.participants!.push(participant);
    this.touch();
  }

  public addMention(mention: ConversationMention): void {
    this.props.mentions!.push(mention);
    this.touch();
  }

  public softDelete(): void {
    this.props.deletedAt = new Date();
    this.touch();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      customerId: this.customerId,
      channelId: this.channelId,
      assignedAgentId: this.assignedAgentId,
      assignedTeamId: this.assignedTeamId,
      status: this.status.value,
      priority: this.priority.value,
      subject: this.subject,
      language: this.language.value,
      sentiment: this.sentiment.value,
      source: this.source.value,
      lastMessageAt: this.lastMessageAt,
      lastActivityAt: this.lastActivityAt,
      firstResponseAt: this.firstResponseAt,
      resolvedAt: this.resolvedAt,
      closedAt: this.closedAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      tags: this.tags.map((t) => t.toJSON()),
      notes: this.notes.map((n) => n.toJSON()),
      participants: this.participants.map((p) => p.toJSON()),
      mentions: this.mentions.map((m) => m.toJSON()),
    };
  }
}
