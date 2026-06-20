import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMessageDraftRepository } from '../repositories/message-repository.interface';
import { MessageDraft } from '../domain/message-draft.entity';
import { SaveDraftDto } from '../dtos';
import { MessageService } from './message.service';
import { MessageTypeEnum, MessageDirectionEnum } from '../domain/value-objects';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class MessageDraftService {
  private readonly logger = new Logger(MessageDraftService.name);

  constructor(
    @Inject('IMessageDraftRepository')
    private readonly draftRepo: IMessageDraftRepository,
    private readonly messageService: MessageService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Upserts the single draft an author holds on a conversation.
   */
  async save(
    tenantId: string,
    authorId: string,
    dto: SaveDraftDto,
  ): Promise<MessageDraft> {
    const existing = await this.draftRepo.findByConversationAndAuthor(
      tenantId,
      dto.conversationId,
      authorId,
    );

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    if (existing) {
      existing.update(dto.draftContent, dto.draftType, expiresAt);
      await this.draftRepo.save(existing, tenantId);
      return existing;
    }

    const draft = new MessageDraft(randomUUID(), {
      tenantId,
      conversationId: dto.conversationId,
      authorId,
      draftContent: dto.draftContent,
      draftType: dto.draftType || 'TEXT',
      expiresAt,
    });
    await this.draftRepo.save(draft, tenantId);
    return draft;
  }

  async listForConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<MessageDraft[]> {
    return this.draftRepo.findByConversation(tenantId, conversationId);
  }

  async getForAuthor(
    tenantId: string,
    conversationId: string,
    authorId: string,
  ): Promise<MessageDraft> {
    const draft = await this.draftRepo.findByConversationAndAuthor(
      tenantId,
      conversationId,
      authorId,
    );
    if (!draft) {
      throw new NotFoundException('No draft found for this author');
    }
    return draft;
  }

  async discard(tenantId: string, id: string): Promise<boolean> {
    return this.draftRepo.delete(id, tenantId);
  }

  /**
   * Promotes a saved draft into a real outbound message and removes the draft.
   */
  async send(
    tenantId: string,
    id: string,
    senderType: string,
    senderId?: string,
  ) {
    const draft = await this.draftRepo.findById(id, tenantId);
    if (!draft) {
      throw new NotFoundException(`Draft with ID ${id} not found`);
    }

    const message = await this.messageService.create(
      tenantId,
      {
        conversationId: draft.conversationId,
        senderId,
        senderType,
        messageType:
          (draft.draftType as MessageTypeEnum) || MessageTypeEnum.TEXT,
        direction: MessageDirectionEnum.OUTBOUND,
        content: draft.draftContent,
      },
      senderId,
    );

    await this.draftRepo.delete(id, tenantId);
    await this.auditService.log({
      tenantId,
      userId: senderId,
      action: 'MESSAGE_DRAFT_SEND',
      details: `Sent draft ${id} as message ${message.id}`,
    });
    return message;
  }

  /**
   * Invoked by the draft-cleanup queue job. Removes expired drafts.
   */
  async cleanupExpired(tenantId?: string): Promise<{ removed: number }> {
    const removed = await this.draftRepo.deleteExpired(tenantId, new Date());
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} expired draft(s)`);
    }
    return { removed };
  }
}
