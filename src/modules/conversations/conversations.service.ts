import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message, SenderType } from './entities/message.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectQueue('inbound-messages') private inboundQueue: Queue,
  ) {}

  async handleIncomingWebhook(
    tenantId: string,
    channelId: string,
    customerId: string,
    content: string,
  ) {
    // 1. Find or create conversation
    let conversation = await this.conversationRepo.findOne({
      where: { customerId, channelId, tenantId },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        tenantId,
        customerId,
        channelId,
      });
      await this.conversationRepo.save(conversation);
    }

    // 2. Save Message
    const message = this.messageRepo.create({
      tenantId,
      conversationId: conversation.id,
      senderType: SenderType.CUSTOMER,
      content,
    });
    await this.messageRepo.save(message);

    // 3. Dispatch to BullMQ for AI Processing & Routing
    await this.inboundQueue.add('process-message', {
      messageId: message.id,
      conversationId: conversation.id,
      tenantId,
      content,
    });

    return message;
  }
}
