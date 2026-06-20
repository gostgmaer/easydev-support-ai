import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';

@Entity('csat_surveys')
export class CsatSurvey extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  channel: string;
}
