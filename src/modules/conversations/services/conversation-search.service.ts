import { Injectable, Inject } from '@nestjs/common';
import type { IConversationRepository } from '../repositories/conversation-repository.interface';
import { Conversation } from '../domain/conversation.aggregate';
import { ConversationQueryDto } from '../dtos';

@Injectable()
export class ConversationSearchService {
  constructor(
    @Inject('IConversationRepository')
    private readonly conversationRepo: IConversationRepository,
  ) {}

  async search(
    tenantId: string,
    query: string,
    limit = 20,
  ): Promise<Conversation[]> {
    return this.conversationRepo.search(tenantId, query, limit);
  }

  async filter(tenantId: string, query: ConversationQueryDto) {
    return this.conversationRepo.findPaginated(tenantId, query);
  }
}
