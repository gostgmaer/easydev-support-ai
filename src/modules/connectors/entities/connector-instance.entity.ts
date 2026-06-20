import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Connector } from './connector.entity';

@Entity('connector_instances')
export class ConnectorInstance extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'connector_id' })
  connectorId: string;

  @ManyToOne(() => Connector)
  @JoinColumn({ name: 'connector_id' })
  connector: Connector;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'jsonb' })
  settings: any;

  @Column({ type: 'jsonb', name: 'credentials_encrypted', select: false })
  credentialsEncrypted: any;
}
