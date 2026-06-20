import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

export enum ChannelType {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  WEB_CHAT = 'WEB_CHAT',
  SLACK = 'SLACK',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
}

@Entity('channels')
export class Channel extends BaseTenantEntity {
  @Column({
    type: 'enum',
    enum: ChannelType,
  })
  type: ChannelType;

  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, any>; // Encrypted in transit/rest

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
