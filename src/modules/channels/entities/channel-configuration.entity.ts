import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Channel } from './channel.entity';

@Entity('channel_configurations')
export class ChannelConfiguration extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'channel_id' })
  channelId: string;

  @ManyToOne(() => Channel)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ type: 'boolean', default: false })
  isSecret: boolean;
}
