import { Injectable, Inject } from '@nestjs/common';
import type { IMessageRepository } from '../repositories/message-repository.interface';
import { Message } from '../domain/message.aggregate';

@Injectable()
export class MessageSearchService {
  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepo: IMessageRepository,
  ) {}

  async search(
    tenantId: string,
    query: string,
    limit = 25,
  ): Promise<Message[]> {
    if (!query || !query.trim()) return [];
    return this.messageRepo.search(tenantId, query.trim(), limit);
  }
}
