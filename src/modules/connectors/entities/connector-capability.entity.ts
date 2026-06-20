import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { ConnectorInstance } from './connector-instance.entity';

@Entity('connector_capabilities')
export class ConnectorCapability extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'connector_instance_id' })
  connectorInstanceId: string;

  @ManyToOne(() => ConnectorInstance)
  @JoinColumn({ name: 'connector_instance_id' })
  connectorInstance: ConnectorInstance;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({ type: 'jsonb', nullable: true })
  schema: any;
}
