import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationTag } from '../domain/conversation-tag.entity';
import { TagConversationDto } from '../dtos';
import { ConversationEventPublisher } from './conversation-event.publisher';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class ConversationTagService {
  private readonly logger = new Logger(ConversationTagService.name);

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

  async addTag(
    tenantId: string,
    conversationId: string,
    dto: TagConversationDto,
    userId?: string,
  ): Promise<ConversationTag> {
    const conversation = await this.getOrThrow(tenantId, conversationId);

    const tag = new ConversationTag(randomUUID(), {
      tenantId,
      conversationId,
      tag: dto.tag,
      color: dto.color,
      isSystemTag: dto.isSystemTag ?? false,
    });

    conversation.addTag(tag);
    await this.conversationRepo.save(conversation, tenantId);
    await this.eventPublisher.publishAll(conversation.domainEvents);
    conversation.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_TAG_ADD',
      details: `Tagged conversation ${conversationId} with ${dto.tag}`,
    });

    return tag;
  }

  // Mirrors InboxAssignmentService.bulkAssign()'s per-item dispatch pattern.
  async bulkAddTag(
    tenantId: string,
    conversationIds: string[],
    dto: TagConversationDto,
    userId?: string,
  ): Promise<{ tagged: number; failed: string[] }> {
    let tagged = 0;
    const failed: string[] = [];
    for (const conversationId of conversationIds) {
      try {
        await this.addTag(tenantId, conversationId, dto, userId);
        tagged += 1;
      } catch (err) {
        this.logger.warn(
          `Bulk tag skipped ${conversationId}: ${err instanceof Error ? err.message : String(err)}`,
        );
        failed.push(conversationId);
      }
    }
    return { tagged, failed };
  }

  async removeTag(
    tenantId: string,
    conversationId: string,
    tag: string,
    userId?: string,
  ): Promise<void> {
    await this.getOrThrow(tenantId, conversationId);
    await this.conversationRepo.removeTag(conversationId, tag, tenantId);

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CONVERSATION_TAG_REMOVE',
      details: `Removed tag ${tag} from conversation ${conversationId}`,
    });
  }

  async listTags(
    tenantId: string,
    conversationId: string,
  ): Promise<ConversationTag[]> {
    return this.conversationRepo.findTags(conversationId, tenantId);
  }
}
