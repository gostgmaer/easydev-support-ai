import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Message } from './message.entity';

@Entity('attachments')
export class Attachment extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'message_id', nullable: true })
  messageId: string;

  @ManyToOne(() => Message)
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 255 })
  fileUrl: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  fileSize: number;
}
