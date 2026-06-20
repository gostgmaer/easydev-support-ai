import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, ilike, sql, desc, asc } from 'drizzle-orm';
import { AgentProfile } from '../domain/agent-profile.entity';
import { AgentCapacity } from '../domain/value-objects';
import { IAgentProfileRepository, AgentProfileQueryOptions } from './agent-profile-repository.interface';

class AgentProfileMapper {
  public static toDomain(raw: any): AgentProfile {
    return new AgentProfile(raw.id, {
      tenantId: raw.tenantId,
      userId: raw.userId,
      employeeCode: raw.employeeCode || undefined,
      displayName: raw.displayName,
      avatarUrl: raw.avatarUrl || undefined,
      status: raw.status,
      capacity: AgentCapacity.create({
        capacity: raw.capacity,
        maxConcurrentConversations: raw.maxConcurrentConversations,
        maxOpenTickets: raw.maxOpenTickets,
      }),
      skillScore: Number(raw.skillScore || 0),
      timezone: raw.timezone,
      languagePreferences: (raw.languagePreferences as string[]) || [],
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: Number(raw.version || 1),
    });
  }
}

@Injectable()
export class DrizzleAgentProfileRepository implements IAgentProfileRepository {
  async findById(id: string, tenantId: string): Promise<AgentProfile | null> {
    const [row] = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.id, id),
          eq(schema.agentProfiles.tenantId, tenantId),
          sql`${schema.agentProfiles.deletedAt} IS NULL`
        )
      );

    if (!row) return null;
    return AgentProfileMapper.toDomain(row);
  }

  async findByUserId(userId: string, tenantId: string): Promise<AgentProfile | null> {
    const [row] = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.userId, userId),
          eq(schema.agentProfiles.tenantId, tenantId),
          sql`${schema.agentProfiles.deletedAt} IS NULL`
        )
      );

    if (!row) return null;
    return AgentProfileMapper.toDomain(row);
  }

  async findByEmployeeCode(employeeCode: string, tenantId: string): Promise<AgentProfile | null> {
    const [row] = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.employeeCode, employeeCode),
          eq(schema.agentProfiles.tenantId, tenantId),
          sql`${schema.agentProfiles.deletedAt} IS NULL`
        )
      );

    if (!row) return null;
    return AgentProfileMapper.toDomain(row);
  }

  async findAll(tenantId: string): Promise<AgentProfile[]> {
    const rows = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.tenantId, tenantId),
          sql`${schema.agentProfiles.deletedAt} IS NULL`
        )
      );

    return rows.map((r) => AgentProfileMapper.toDomain(r));
  }

  async findPaginated(
    tenantId: string,
    options: AgentProfileQueryOptions
  ): Promise<{ data: AgentProfile[]; total: number }> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.agentProfiles.tenantId, tenantId),
      sql`${schema.agentProfiles.deletedAt} IS NULL`,
    ];

    if (options.status) {
      conditions.push(eq(schema.agentProfiles.status, options.status));
    }

    if (options.search) {
      conditions.push(
        ilike(schema.agentProfiles.displayName, `%${options.search}%`)
      );
    }

    const whereClause = and(...conditions);
    const order = options.sortOrder === 'DESC' ? desc(schema.agentProfiles.createdAt) : asc(schema.agentProfiles.createdAt);

    const rows = await db
      .select()
      .from(schema.agentProfiles)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.agentProfiles)
      .where(whereClause);
    const total = Number(countResult?.count || 0);

    return {
      data: rows.map((r) => AgentProfileMapper.toDomain(r)),
      total,
    };
  }

  async save(profile: AgentProfile, tenantId: string): Promise<AgentProfile> {
    const raw = {
      id: profile.id,
      tenantId: profile.tenantId,
      userId: profile.userId,
      employeeCode: profile.employeeCode || null,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl || null,
      status: profile.status,
      capacity: profile.capacity.capacity,
      maxConcurrentConversations: profile.capacity.maxConcurrentConversations,
      maxOpenTickets: profile.capacity.maxOpenTickets,
      skillScore: profile.skillScore,
      timezone: profile.timezone,
      languagePreferences: profile.languagePreferences || null,
      metadata: profile.metadata || null,
      updatedAt: new Date(),
      deletedAt: profile.deletedAt || null,
      version: profile.version,
    };

    const [existing] = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.id, profile.id),
          eq(schema.agentProfiles.tenantId, tenantId)
        )
      );

    if (existing) {
      await db
        .update(schema.agentProfiles)
        .set(raw)
        .where(
          and(
            eq(schema.agentProfiles.id, profile.id),
            eq(schema.agentProfiles.tenantId, tenantId)
          )
        );
    } else {
      await db.insert(schema.agentProfiles).values({
        ...raw,
        createdAt: profile.createdAt,
        updatedAt: profile.createdAt,
      });
    }

    return profile;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.agentProfiles)
      .where(
        and(
          eq(schema.agentProfiles.id, id),
          eq(schema.agentProfiles.tenantId, tenantId)
        )
      );

    if (!existing) return false;

    await db
      .update(schema.agentProfiles)
      .set({
        deletedAt: new Date(),
        status: 'INACTIVE',
      })
      .where(
        and(
          eq(schema.agentProfiles.id, id),
          eq(schema.agentProfiles.tenantId, tenantId)
        )
      );

    return true;
  }
}
