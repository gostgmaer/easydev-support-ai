import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { Team } from '../domain/team.aggregate';
import { TeamMember } from '../domain/team-member.entity';
import { AssignmentRule } from '../domain/assignment-rule.entity';
import { ITeamRepository, TeamQueryOptions } from './team-repository.interface';
import { AssignmentStrategyEnum } from '../domain/value-objects';

class TeamMapper {
  public static toDomain(
    rawTeam: any,
    rawMembers: any[] = [],
    rawRules: any[] = [],
  ): Team {
    const members = rawMembers.map(
      (m) =>
        new TeamMember(m.id, {
          tenantId: m.tenantId,
          teamId: m.teamId,
          agentProfileId: m.agentProfileId,
          role: m.role,
          joinedAt: m.joinedAt,
          isPrimary: !!m.isPrimary,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }),
    );

    const rules = rawRules.map(
      (r) =>
        new AssignmentRule(r.id, {
          tenantId: r.tenantId,
          teamId: r.teamId,
          ruleType: r.ruleType as AssignmentStrategyEnum,
          priority: r.priority,
          configuration: r.configuration as Record<string, any>,
          isActive: !!r.isActive,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }),
    );

    return new Team(rawTeam.id, {
      tenantId: rawTeam.tenantId,
      name: rawTeam.name,
      description: rawTeam.description || undefined,
      department: rawTeam.department || undefined,
      priority: rawTeam.priority,
      isActive: !!rawTeam.isActive,
      metadata: (rawTeam.metadata as Record<string, any>) || {},
      createdAt: rawTeam.createdAt,
      updatedAt: rawTeam.updatedAt,
      deletedAt: rawTeam.deletedAt || undefined,
      version: rawTeam.version || 1,
      members,
      rules,
    });
  }
}

@Injectable()
export class DrizzleTeamRepository implements ITeamRepository {
  async findById(id: string, tenantId: string): Promise<Team | null> {
    const [rawTeam] = await db
      .select()
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.id, id),
          eq(schema.teams.tenantId, tenantId),
          sql`${schema.teams.deletedAt} IS NULL`,
        ),
      );

    if (!rawTeam) return null;

    const rawMembers = await db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, id),
          eq(schema.teamMembers.tenantId, tenantId),
        ),
      );

    const rawRules = await db
      .select()
      .from(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.teamId, id),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      );

    return TeamMapper.toDomain(rawTeam, rawMembers, rawRules);
  }

  async findByName(name: string, tenantId: string): Promise<Team | null> {
    const [rawTeam] = await db
      .select()
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.name, name),
          eq(schema.teams.tenantId, tenantId),
          sql`${schema.teams.deletedAt} IS NULL`,
        ),
      );

    if (!rawTeam) return null;

    const rawMembers = await db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, rawTeam.id),
          eq(schema.teamMembers.tenantId, tenantId),
        ),
      );

    const rawRules = await db
      .select()
      .from(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.teamId, rawTeam.id),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      );

    return TeamMapper.toDomain(rawTeam, rawMembers, rawRules);
  }

  async findAll(tenantId: string): Promise<Team[]> {
    const rawTeams = await db
      .select()
      .from(schema.teams)
      .where(
        and(
          eq(schema.teams.tenantId, tenantId),
          sql`${schema.teams.deletedAt} IS NULL`,
        ),
      );

    const result: Team[] = [];
    for (const rawTeam of rawTeams) {
      const rawMembers = await db
        .select()
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, rawTeam.id),
            eq(schema.teamMembers.tenantId, tenantId),
          ),
        );

      const rawRules = await db
        .select()
        .from(schema.assignmentRules)
        .where(
          and(
            eq(schema.assignmentRules.teamId, rawTeam.id),
            eq(schema.assignmentRules.tenantId, tenantId),
          ),
        );

      result.push(TeamMapper.toDomain(rawTeam, rawMembers, rawRules));
    }
    return result;
  }

  async findPaginated(
    tenantId: string,
    options: TeamQueryOptions,
  ): Promise<{ data: Team[]; total: number }> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.teams.tenantId, tenantId),
      sql`${schema.teams.deletedAt} IS NULL`,
    ];

    if (options.department) {
      conditions.push(eq(schema.teams.department, options.department));
    }

    if (options.search) {
      conditions.push(ilike(schema.teams.name, `%${options.search}%`));
    }

    const whereClause = and(...conditions);
    const order =
      options.sortOrder === 'DESC'
        ? desc(schema.teams.createdAt)
        : asc(schema.teams.createdAt);

    const rawTeams = await db
      .select()
      .from(schema.teams)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.teams)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    const data: Team[] = [];
    for (const rawTeam of rawTeams) {
      const rawMembers = await db
        .select()
        .from(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, rawTeam.id),
            eq(schema.teamMembers.tenantId, tenantId),
          ),
        );

      const rawRules = await db
        .select()
        .from(schema.assignmentRules)
        .where(
          and(
            eq(schema.assignmentRules.teamId, rawTeam.id),
            eq(schema.assignmentRules.tenantId, tenantId),
          ),
        );

      data.push(TeamMapper.toDomain(rawTeam, rawMembers, rawRules));
    }

    return { data, total };
  }

  async save(team: Team, tenantId: string): Promise<Team> {
    const rawTeam = {
      id: team.id,
      tenantId: team.tenantId,
      name: team.name,
      description: team.description || null,
      department: team.department || null,
      priority: team.priority,
      isActive: team.isActive,
      metadata: team.metadata || null,
      updatedAt: new Date(),
      deletedAt: team.deletedAt || null,
      version: team.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.teams)
        .where(
          and(
            eq(schema.teams.id, team.id),
            eq(schema.teams.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.teams)
          .set(rawTeam)
          .where(
            and(
              eq(schema.teams.id, team.id),
              eq(schema.teams.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.teams).values({
          ...rawTeam,
          createdAt: team.createdAt,
          updatedAt: team.createdAt,
        });
      }

      await tx
        .delete(schema.teamMembers)
        .where(
          and(
            eq(schema.teamMembers.teamId, team.id),
            eq(schema.teamMembers.tenantId, tenantId),
          ),
        );

      for (const member of team.members) {
        await tx.insert(schema.teamMembers).values({
          id: member.id,
          tenantId: member.tenantId,
          teamId: member.teamId,
          agentProfileId: member.agentProfileId,
          role: member.role,
          joinedAt: member.joinedAt,
          isPrimary: member.isPrimary,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          version: 1,
        });
      }

      await tx
        .delete(schema.assignmentRules)
        .where(
          and(
            eq(schema.assignmentRules.teamId, team.id),
            eq(schema.assignmentRules.tenantId, tenantId),
          ),
        );

      for (const rule of team.rules) {
        await tx.insert(schema.assignmentRules).values({
          id: rule.id,
          tenantId: rule.tenantId,
          teamId: rule.teamId,
          ruleType: rule.ruleType,
          priority: rule.priority,
          configuration: rule.configuration,
          isActive: rule.isActive,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt,
          version: 1,
        });
      }
    });

    return team;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.teams)
      .where(and(eq(schema.teams.id, id), eq(schema.teams.tenantId, tenantId)));

    if (!existing) return false;

    await db
      .update(schema.teams)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(and(eq(schema.teams.id, id), eq(schema.teams.tenantId, tenantId)));

    return true;
  }

  async addMember(member: TeamMember, tenantId: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, member.teamId),
          eq(schema.teamMembers.agentProfileId, member.agentProfileId),
          eq(schema.teamMembers.tenantId, tenantId),
        ),
      );

    if (!existing) {
      await db.insert(schema.teamMembers).values({
        id: member.id,
        tenantId: member.tenantId,
        teamId: member.teamId,
        agentProfileId: member.agentProfileId,
        role: member.role,
        joinedAt: member.joinedAt,
        isPrimary: member.isPrimary,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        version: 1,
      });
    }
  }

  async removeMember(
    teamId: string,
    agentProfileId: string,
    tenantId: string,
  ): Promise<void> {
    await db
      .delete(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.agentProfileId, agentProfileId),
          eq(schema.teamMembers.tenantId, tenantId),
        ),
      );
  }

  async findTeamMembers(
    teamId: string,
    tenantId: string,
  ): Promise<TeamMember[]> {
    const rows = await db
      .select()
      .from(schema.teamMembers)
      .where(
        and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.tenantId, tenantId),
        ),
      );

    return rows.map(
      (m) =>
        new TeamMember(m.id, {
          tenantId: m.tenantId,
          teamId: m.teamId,
          agentProfileId: m.agentProfileId,
          role: m.role,
          joinedAt: m.joinedAt,
          isPrimary: !!m.isPrimary,
        }),
    );
  }

  async saveRule(rule: AssignmentRule, tenantId: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.id, rule.id),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      );

    const raw = {
      id: rule.id,
      tenantId: rule.tenantId,
      teamId: rule.teamId,
      ruleType: rule.ruleType,
      priority: rule.priority,
      configuration: rule.configuration,
      isActive: rule.isActive,
      updatedAt: new Date(),
      version: 1,
    };

    if (existing) {
      await db
        .update(schema.assignmentRules)
        .set(raw)
        .where(
          and(
            eq(schema.assignmentRules.id, rule.id),
            eq(schema.assignmentRules.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.assignmentRules).values({
        ...raw,
        createdAt: rule.createdAt,
        updatedAt: rule.createdAt,
      });
    }
  }

  async findRules(teamId: string, tenantId: string): Promise<AssignmentRule[]> {
    const rows = await db
      .select()
      .from(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.teamId, teamId),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      );

    return rows.map(
      (r) =>
        new AssignmentRule(r.id, {
          tenantId: r.tenantId,
          teamId: r.teamId,
          ruleType: r.ruleType as AssignmentStrategyEnum,
          priority: r.priority,
          configuration: r.configuration as Record<string, any>,
          isActive: r.isActive,
        }),
    );
  }

  async deleteRule(ruleId: string, tenantId: string): Promise<void> {
    await db
      .delete(schema.assignmentRules)
      .where(
        and(
          eq(schema.assignmentRules.id, ruleId),
          eq(schema.assignmentRules.tenantId, tenantId),
        ),
      );
  }
}
