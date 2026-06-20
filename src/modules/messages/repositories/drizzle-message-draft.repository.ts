import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, lte, desc, isNotNull } from 'drizzle-orm';
import { MessageDraft } from '../domain/message-draft.entity';
import { IMessageDraftRepository } from './message-repository.interface';
import { MessageMapper } from './message.mapper';

@Injectable()
export class DrizzleMessageDraftRepository implements IMessageDraftRepository {
  async findById(id: string, tenantId: string): Promise<MessageDraft | null> {
    const [row] = await db
      .select()
      .from(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.id, id),
          eq(schema.messageDrafts.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    return MessageMapper.draftToDomain(row);
  }

  async findAll(tenantId: string): Promise<MessageDraft[]> {
    const rows = await db
      .select()
      .from(schema.messageDrafts)
      .where(eq(schema.messageDrafts.tenantId, tenantId));
    return rows.map((r) => MessageMapper.draftToDomain(r));
  }

  async findByConversationAndAuthor(
    tenantId: string,
    conversationId: string,
    authorId: string,
  ): Promise<MessageDraft | null> {
    const [row] = await db
      .select()
      .from(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.tenantId, tenantId),
          eq(schema.messageDrafts.conversationId, conversationId),
          eq(schema.messageDrafts.authorId, authorId),
        ),
      );
    if (!row) return null;
    return MessageMapper.draftToDomain(row);
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<MessageDraft[]> {
    const rows = await db
      .select()
      .from(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.tenantId, tenantId),
          eq(schema.messageDrafts.conversationId, conversationId),
        ),
      )
      .orderBy(desc(schema.messageDrafts.updatedAt));
    return rows.map((r) => MessageMapper.draftToDomain(r));
  }

  async save(draft: MessageDraft, tenantId: string): Promise<MessageDraft> {
    const raw = {
      id: draft.id,
      tenantId,
      conversationId: draft.conversationId,
      authorId: draft.authorId,
      draftContent: draft.draftContent,
      draftType: draft.draftType,
      expiresAt: draft.expiresAt || null,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.id, draft.id),
          eq(schema.messageDrafts.tenantId, tenantId),
        ),
      );

    if (existing) {
      await db
        .update(schema.messageDrafts)
        .set(raw)
        .where(
          and(
            eq(schema.messageDrafts.id, draft.id),
            eq(schema.messageDrafts.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.messageDrafts)
        .values({ ...raw, createdAt: draft.createdAt });
    }
    return draft;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.id, id),
          eq(schema.messageDrafts.tenantId, tenantId),
        ),
      );
    if (!existing) return false;
    await db
      .delete(schema.messageDrafts)
      .where(
        and(
          eq(schema.messageDrafts.id, id),
          eq(schema.messageDrafts.tenantId, tenantId),
        ),
      );
    return true;
  }

  async deleteExpired(
    tenantId: string | undefined,
    now: Date,
  ): Promise<number> {
    const conditions: any[] = [
      isNotNull(schema.messageDrafts.expiresAt),
      lte(schema.messageDrafts.expiresAt, now),
    ];
    if (tenantId) conditions.push(eq(schema.messageDrafts.tenantId, tenantId));
    const deleted = await db
      .delete(schema.messageDrafts)
      .where(and(...conditions))
      .returning({ id: schema.messageDrafts.id });
    return deleted.length;
  }
}
