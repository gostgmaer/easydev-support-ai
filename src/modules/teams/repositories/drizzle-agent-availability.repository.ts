import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, sql } from 'drizzle-orm';
import { AgentAvailability } from '../domain/agent-availability.entity';
import { IAgentAvailabilityRepository } from './agent-availability-repository.interface';

class AgentAvailabilityMapper {
  public static toDomain(raw: any): AgentAvailability {
    return new AgentAvailability(raw.id, {
      tenantId: raw.tenantId,
      agentProfileId: raw.agentProfileId,
      status: raw.status,
      lastSeenAt: raw.lastSeenAt,
      workingHours: (raw.workingHours as Record<string, any>) || {},
      currentLoad: raw.currentLoad,
      activeConversations: raw.activeConversations,
      activeTickets: raw.activeTickets,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}

@Injectable()
export class DrizzleAgentAvailabilityRepository implements IAgentAvailabilityRepository {
  async findById(id: string, tenantId: string): Promise<AgentAvailability | null> {
    const [row] = await db
      .select()
      .from(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.id, id),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );

    if (!row) return null;
    return AgentAvailabilityMapper.toDomain(row);
  }

  async findByAgentProfileId(agentProfileId: string, tenantId: string): Promise<AgentAvailability | null> {
    const [row] = await db
      .select()
      .from(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.agentProfileId, agentProfileId),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );

    if (!row) return null;
    return AgentAvailabilityMapper.toDomain(row);
  }

  async findOnlineAgents(tenantId: string): Promise<AgentAvailability[]> {
    const rows = await db
      .select()
      .from(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.tenantId, tenantId),
          eq(schema.agentAvailability.status, 'ONLINE')
        )
      );

    return rows.map((r) => AgentAvailabilityMapper.toDomain(r));
  }

  async findAll(tenantId: string): Promise<AgentAvailability[]> {
    const rows = await db
      .select()
      .from(schema.agentAvailability)
      .where(eq(schema.agentAvailability.tenantId, tenantId));

    return rows.map((r) => AgentAvailabilityMapper.toDomain(r));
  }

  async save(availability: AgentAvailability, tenantId: string): Promise<AgentAvailability> {
    const raw = {
      id: availability.id,
      tenantId: availability.tenantId,
      agentProfileId: availability.agentProfileId,
      status: availability.status,
      lastSeenAt: availability.lastSeenAt,
      workingHours: availability.workingHours || null,
      currentLoad: availability.currentLoad,
      activeConversations: availability.activeConversations,
      activeTickets: availability.activeTickets,
      updatedAt: new Date(),
      version: 1,
    };

    const [existing] = await db
      .select()
      .from(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.id, availability.id),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );

    if (existing) {
      await db
        .update(schema.agentAvailability)
        .set(raw)
        .where(
          and(
            eq(schema.agentAvailability.id, availability.id),
            eq(schema.agentAvailability.tenantId, tenantId)
          )
        );
    } else {
      await db.insert(schema.agentAvailability).values({
        ...raw,
        createdAt: availability.createdAt,
        updatedAt: availability.createdAt,
      });
    }

    return availability;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.id, id),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );

    if (!existing) return false;

    await db
      .delete(schema.agentAvailability)
      .where(
        and(
          eq(schema.agentAvailability.id, id),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );

    return true;
  }

  async updateLoad(agentProfileId: string, change: number, tenantId: string): Promise<void> {
    await db
      .update(schema.agentAvailability)
      .set({
        currentLoad: sql`${schema.agentAvailability.currentLoad} + ${change}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.agentAvailability.agentProfileId, agentProfileId),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );
  }

  async updateCounters(
    agentProfileId: string,
    conversationsChange: number,
    ticketsChange: number,
    tenantId: string
  ): Promise<void> {
    await db
      .update(schema.agentAvailability)
      .set({
        activeConversations: sql`${schema.agentAvailability.activeConversations} + ${conversationsChange}`,
        activeTickets: sql`${schema.agentAvailability.activeTickets} + ${ticketsChange}`,
        currentLoad: sql`${schema.agentAvailability.currentLoad} + ${conversationsChange + ticketsChange}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.agentAvailability.agentProfileId, agentProfileId),
          eq(schema.agentAvailability.tenantId, tenantId)
        )
      );
  }
}
