import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { MessageTemplate } from '../domain/message-template.entity';
import {
  IMessageTemplateRepository,
  PaginatedResult,
} from './message-repository.interface';
import { MessageMapper } from './message.mapper';

@Injectable()
export class DrizzleMessageTemplateRepository
  implements IMessageTemplateRepository
{
  async findById(id: string, tenantId: string): Promise<MessageTemplate | null> {
    const [row] = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.id, id),
          eq(schema.messageTemplates.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return MessageMapper.templateToDomain(row);
  }

  async findAll(tenantId: string): Promise<MessageTemplate[]> {
    const rows = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.tenantId, tenantId),
          isNull(schema.messageTemplates.deletedAt),
        ),
      );
    return rows.map((r) => MessageMapper.templateToDomain(r));
  }

  async findByName(
    tenantId: string,
    name: string,
  ): Promise<MessageTemplate | null> {
    const [row] = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.tenantId, tenantId),
          eq(schema.messageTemplates.name, name),
        ),
      );
    if (!row) return null;
    return MessageMapper.templateToDomain(row);
  }

  async findPaginated(
    tenantId: string,
    page: number,
    limit: number,
    category?: string,
  ): Promise<PaginatedResult<MessageTemplate>> {
    const offset = (page - 1) * limit;
    const conditions: any[] = [
      eq(schema.messageTemplates.tenantId, tenantId),
      isNull(schema.messageTemplates.deletedAt),
    ];
    if (category)
      conditions.push(eq(schema.messageTemplates.category, category));
    const whereClause = and(...conditions);

    const rows = await db
      .select()
      .from(schema.messageTemplates)
      .where(whereClause)
      .orderBy(desc(schema.messageTemplates.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.messageTemplates)
      .where(whereClause);

    return {
      data: rows.map((r) => MessageMapper.templateToDomain(r)),
      total: Number(count),
    };
  }

  async save(
    template: MessageTemplate,
    tenantId: string,
  ): Promise<MessageTemplate> {
    const raw = {
      id: template.id,
      tenantId,
      name: template.name,
      channelType: template.channelType || null,
      category: template.category || null,
      content: template.content,
      contentHtml: template.contentHtml || null,
      variables: template.variables || null,
      language: template.language,
      isActive: template.isActive,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.id, template.id),
          eq(schema.messageTemplates.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.messageTemplates)
        .set(raw)
        .where(
          and(
            eq(schema.messageTemplates.id, template.id),
            eq(schema.messageTemplates.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.messageTemplates)
        .values({ ...raw, createdAt: template.createdAt });
    }
    return template;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.messageTemplates)
      .where(
        and(
          eq(schema.messageTemplates.id, id),
          eq(schema.messageTemplates.tenantId, tenantId),
        ),
      );
    if (!existing) return false;
    await db
      .update(schema.messageTemplates)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.messageTemplates.id, id),
          eq(schema.messageTemplates.tenantId, tenantId),
        ),
      );
    return true;
  }
}
