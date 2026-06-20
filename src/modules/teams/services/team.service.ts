import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { ITeamRepository } from '../repositories/team-repository.interface';
import type { IAgentProfileRepository } from '../repositories/agent-profile-repository.interface';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { CreateTeamDto, UpdateTeamDto, TeamQueryDto } from '../dtos';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';
import { TeamEventPublisher } from './team-event.publisher';

@Injectable()
export class TeamService {
  constructor(
    @Inject('ITeamRepository')
    private readonly teamRepo: ITeamRepository,
    @Inject('IAgentProfileRepository')
    private readonly profileRepo: IAgentProfileRepository,
    private readonly eventPublisher: TeamEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateTeamDto,
    userId?: string,
  ): Promise<Team> {
    const existing = await this.teamRepo.findByName(dto.name, tenantId);
    if (existing) {
      throw new ConflictException(`Team with name ${dto.name} already exists`);
    }

    const team = Team.create(randomUUID(), {
      tenantId,
      name: dto.name,
      description: dto.description,
      department: dto.department,
      priority: dto.priority ?? 1,
      isActive: dto.isActive ?? true,
      metadata: dto.metadata,
    });

    const saved = await this.teamRepo.save(team, tenantId);
    await this.eventPublisher.publishAll(team.domainEvents);
    team.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_CREATE',
      details: `Created team ${team.name}`,
    });

    return saved;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTeamDto,
    userId?: string,
  ): Promise<Team> {
    const team = await this.teamRepo.findById(id, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    team.update(dto);
    const saved = await this.teamRepo.save(team, tenantId);
    await this.eventPublisher.publishAll(team.domainEvents);
    team.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_UPDATE',
      details: `Updated team ${team.name}`,
    });

    return saved;
  }

  async archive(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const team = await this.teamRepo.findById(id, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    team.archive();
    await this.teamRepo.save(team, tenantId);
    await this.eventPublisher.publishAll(team.domainEvents);
    team.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_ARCHIVE',
      details: `Archived team ${id}`,
    });

    return true;
  }

  async addAgent(
    tenantId: string,
    teamId: string,
    agentProfileId: string,
    role = 'MEMBER',
    userId?: string,
  ): Promise<void> {
    const team = await this.teamRepo.findById(teamId, tenantId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    const agent = await this.profileRepo.findById(agentProfileId, tenantId);
    if (!agent)
      throw new NotFoundException(`Agent ${agentProfileId} not found`);

    const member = new TeamMember(randomUUID(), {
      tenantId,
      teamId,
      agentProfileId,
      role,
      isPrimary: false,
    });

    team.addMember(member);
    await this.teamRepo.save(team, tenantId);
    await this.eventPublisher.publishAll(team.domainEvents);
    team.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_MEMBER_ADD',
      details: `Added agent ${agentProfileId} to team ${teamId}`,
    });
  }

  async removeAgent(
    tenantId: string,
    teamId: string,
    agentProfileId: string,
    userId?: string,
  ): Promise<void> {
    const team = await this.teamRepo.findById(teamId, tenantId);
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);

    team.removeMember(agentProfileId);
    await this.teamRepo.save(team, tenantId);
    await this.eventPublisher.publishAll(team.domainEvents);
    team.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_MEMBER_REMOVE',
      details: `Removed agent ${agentProfileId} from team ${teamId}`,
    });
  }

  async moveAgent(
    tenantId: string,
    fromTeamId: string,
    toTeamId: string,
    agentProfileId: string,
    userId?: string,
  ): Promise<void> {
    const fromTeam = await this.teamRepo.findById(fromTeamId, tenantId);
    const toTeam = await this.teamRepo.findById(toTeamId, tenantId);

    if (!fromTeam || !toTeam) {
      throw new NotFoundException('Source or destination team not found');
    }

    fromTeam.moveMember(agentProfileId, fromTeamId, toTeamId);
    const member = new TeamMember(randomUUID(), {
      tenantId,
      teamId: toTeamId,
      agentProfileId,
      role: 'MEMBER',
      isPrimary: false,
    });
    toTeam.addMember(member);

    await this.teamRepo.save(fromTeam, tenantId);
    await this.teamRepo.save(toTeam, tenantId);

    await this.eventPublisher.publishAll(fromTeam.domainEvents);
    await this.eventPublisher.publishAll(toTeam.domainEvents);
    fromTeam.clearEvents();
    toTeam.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'TEAM_MEMBER_MOVE',
      details: `Moved agent ${agentProfileId} from team ${fromTeamId} to ${toTeamId}`,
    });
  }

  async findById(tenantId: string, id: string): Promise<Team> {
    const team = await this.teamRepo.findById(id, tenantId);
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    return team;
  }

  async findPaginated(tenantId: string, query: TeamQueryDto) {
    return this.teamRepo.findPaginated(tenantId, query);
  }
}
