import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Conversation } from './conversation.entity';

export enum SenderType {
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER',
  BOT = 'BOT',
  SYSTEM = 'SYSTEM',
}

@Entity('messages')
export class Message extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: SenderType,
  })
  senderType: SenderType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  mediaUrls: string[];
}
