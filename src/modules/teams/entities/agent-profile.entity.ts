import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTenantEntity } from '../../../common/database/base.entity';
import { Team } from './team.entity';

@Entity('agent_profiles')
export class AgentProfile extends BaseTenantEntity {
  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string; // Links to EasyDev IAM

  @Column({ type: 'uuid', name: 'team_id', nullable: true })
  teamId: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'jsonb', nullable: true })
  skills: string[];
}
