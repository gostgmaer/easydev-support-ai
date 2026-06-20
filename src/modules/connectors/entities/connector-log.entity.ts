import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { ConnectorInstance } from './connector-instance.entity';

@Entity('connector_logs')
export class ConnectorLog extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'connector_instance_id' })
  connectorInstanceId: string;

  @ManyToOne(() => ConnectorInstance)
  @JoinColumn({ name: 'connector_instance_id' })
  connectorInstance: ConnectorInstance;

  @Column({ type: 'varchar', length: 100 })
  capabilityName: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'jsonb', nullable: true })
  requestPayload: any;

  @Column({ type: 'jsonb', nullable: true })
  responsePayload: any;

  @Column({ type: 'int', name: 'status_code' })
  statusCode: number;

  @Column({ type: 'int', name: 'latency_ms' })
  latencyMs: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}
