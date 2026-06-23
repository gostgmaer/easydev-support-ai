import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationNote } from '../domain/conversation-note.entity';
import { ConversationMention } from '../domain/conversation-mention.entity';
import { AddNoteDto, MentionUserDto } from '../dtos';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ConversationNoteService {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
    private readonly eventPublisher: ConversationEventPublisher,
    private readonly auditService: AuditService,
  ) {}

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

  async addNote(
    tenantId: string,
    conversationId: string,
    dto: AddNoteDto,
    authorId: string,
  ): Promise<ConversationNote> {
    const conversation = await this.getOrThrow(tenantId, conversationId);

    const note = new ConversationNote(randomUUID(), {
      tenantId,
      conversationId,
      authorId,
      note: dto.note,
      visibility: dto.visibility || 'INTERNAL',
    });

    conversation.addNote(note);
    await this.conversationRepo.save(conversation, tenantId);
    await this.eventPublisher.publishAll(conversation.domainEvents);
    conversation.clearEvents();

    await this.auditService.log({
      tenantId,
      userId: authorId,
      action: 'CONVERSATION_NOTE_ADD',
      details: `Added internal note to conversation ${conversationId}`,
    });

    return note;
  }

  // Every note here is INTERNAL/PRIVATE by construction (see AddNoteDto -
  // there is no PUBLIC visibility for conversation notes), unlike ticket
  // comments which mix PUBLIC and INTERNAL in one table. Do not wire this
  // into any customer-facing controller - there is no customer-safe subset
  // to filter down to.
  async listNotes(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationNote[]> {
    return this.conversationRepo.findNotes(conversationId, tenantId);
  }

  async mention(
    tenantId: string,
    conversationId: string,
    dto: MentionUserDto,
    mentionedBy: string,
  ): Promise<ConversationMention> {
    const conversation = await this.getOrThrow(tenantId, conversationId);

    const mention = new ConversationMention(randomUUID(), {
      tenantId,
      conversationId,
      mentionedUserId: dto.mentionedUserId,
      mentionedBy,
      messageReference: dto.messageReference,
    });

    conversation.addMention(mention);
    await this.conversationRepo.save(conversation, tenantId);

    await this.auditService.log({
      tenantId,
      userId: mentionedBy,
      action: 'CONVERSATION_MENTION',
      details: `Mentioned user ${dto.mentionedUserId} in conversation ${conversationId}`,
    });

    return mention;
  }

  async listMentions(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationMention[]> {
    return this.conversationRepo.findMentions(conversationId, tenantId);
  }
}
