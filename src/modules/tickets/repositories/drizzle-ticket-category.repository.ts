import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, asc, isNull } from 'drizzle-orm';
import { TicketCategoryDefinition } from '../domain/ticket-category.entity';
import { ITicketCategoryRepository } from './ticket-repository.interface';
import { TicketMapper } from './ticket.mapper';

@Injectable()
export class DrizzleTicketCategoryRepository implements ITicketCategoryRepository {
  async findById(
    id: string,
    tenantId: string,
  ): Promise<TicketCategoryDefinition | null> {
    const [row] = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.id, id),
          eq(schema.ticketCategories.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return TicketMapper.categoryToDomain(row);
  }

  async findAll(tenantId: string): Promise<TicketCategoryDefinition[]> {
    const rows = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.tenantId, tenantId),
          isNull(schema.ticketCategories.deletedAt),
        ),
      )
      .orderBy(asc(schema.ticketCategories.name));
    return rows.map((r) => TicketMapper.categoryToDomain(r));
  }

  async findActive(tenantId: string): Promise<TicketCategoryDefinition[]> {
    const rows = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.tenantId, tenantId),
          eq(schema.ticketCategories.isActive, true),
          isNull(schema.ticketCategories.deletedAt),
        ),
      )
      .orderBy(asc(schema.ticketCategories.name));
    return rows.map((r) => TicketMapper.categoryToDomain(r));
  }

  async findByName(
    tenantId: string,
    name: string,
  ): Promise<TicketCategoryDefinition | null> {
    const [row] = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.tenantId, tenantId),
          eq(schema.ticketCategories.name, name),
        ),
      );
    if (!row) return null;
    return TicketMapper.categoryToDomain(row);
  }

  async save(
    category: TicketCategoryDefinition,
    tenantId: string,
  ): Promise<TicketCategoryDefinition> {
    const raw = {
      id: category.id,
      tenantId,
      name: category.name.value,
      description: category.description || null,
      color: category.color || null,
      isActive: category.isActive,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.id, category.id),
          eq(schema.ticketCategories.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.ticketCategories)
        .set(raw)
        .where(
          and(
            eq(schema.ticketCategories.id, category.id),
            eq(schema.ticketCategories.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.ticketCategories)
        .values({ ...raw, createdAt: category.createdAt });
    }
    return category;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.ticketCategories)
      .where(
        and(
          eq(schema.ticketCategories.id, id),
          eq(schema.ticketCategories.tenantId, tenantId),
        ),
      );
    if (!existing) return false;
    await db
      .update(schema.ticketCategories)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.ticketCategories.id, id),
          eq(schema.ticketCategories.tenantId, tenantId),
        ),
      );
    return true;
  }
}
