import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

@Entity('ai_conversation_sessions')
export class AiConversationSession extends BaseTenantEntity {
  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @Column({ type: 'uuid' })
  agentId: string;

  @Column({ type: 'uuid', nullable: true })
  workflowExecutionId: string;

  @Column({ type: 'jsonb', nullable: true })
  sessionState: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt: Date;

  @Column({ type: 'integer', default: 1 })
  contextVersion: number;
}
