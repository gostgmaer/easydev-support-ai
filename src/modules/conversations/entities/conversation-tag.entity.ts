import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Conversation } from './conversation.entity';

@Entity('conversation_tags')
export class ConversationTag extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  color: string;

  @ManyToMany(() => Conversation)
  @JoinTable({
    name: 'conversation_tag_mappings',
    joinColumn: { name: 'tag_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'conversation_id', referencedColumnName: 'id' },
  })
  conversations: Conversation[];
}
