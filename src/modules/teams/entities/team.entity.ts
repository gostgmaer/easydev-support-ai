import { Entity, Column } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';

export enum RoutingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_LOADED = 'LEAST_LOADED',
  SKILL_BASED = 'SKILL_BASED',
}

@Entity('teams')
export class Team extends BaseTenantEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: RoutingStrategy,
    default: RoutingStrategy.ROUND_ROBIN,
  })
  routingStrategy: RoutingStrategy;
}
