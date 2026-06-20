import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and } from 'drizzle-orm';
import { CustomerSegment } from '../domain/customer-segment.entity';
import { ICustomerSegmentRepository } from './customer-segment-repository.interface';

class CustomerSegmentMapper {
  public static toDomain(raw: any): CustomerSegment {
    return new CustomerSegment(raw.id, {
      tenantId: raw.tenantId,
      segmentName: raw.segmentName,
      segmentType: raw.segmentType,
      rules: raw.rules,
      description: raw.description || undefined,
      isActive: !!raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}

@Injectable()
export class DrizzleCustomerSegmentRepository implements ICustomerSegmentRepository {
  async findById(id: string, tenantId: string): Promise<CustomerSegment | null> {
    const [row] = await db
      .select()
      .from(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.id, id),
          eq(schema.customerSegments.tenantId, tenantId)
        )
      );

    if (!row) return null;
    return CustomerSegmentMapper.toDomain(row);
  }

  async findByName(name: string, tenantId: string): Promise<CustomerSegment | null> {
    const [row] = await db
      .select()
      .from(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.segmentName, name),
          eq(schema.customerSegments.tenantId, tenantId)
        )
      );

    if (!row) return null;
    return CustomerSegmentMapper.toDomain(row);
  }

  async findAll(tenantId: string): Promise<CustomerSegment[]> {
    const rows = await db
      .select()
      .from(schema.customerSegments)
      .where(eq(schema.customerSegments.tenantId, tenantId));

    return rows.map((r) => CustomerSegmentMapper.toDomain(r));
  }

  async findActive(tenantId: string): Promise<CustomerSegment[]> {
    const rows = await db
      .select()
      .from(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.tenantId, tenantId),
          eq(schema.customerSegments.isActive, true)
        )
      );

    return rows.map((r) => CustomerSegmentMapper.toDomain(r));
  }

  async save(segment: CustomerSegment, tenantId: string): Promise<CustomerSegment> {
    const raw = {
      id: segment.id,
      tenantId: segment.tenantId,
      segmentName: segment.segmentName,
      segmentType: segment.segmentType,
      rules: segment.rules || null,
      description: segment.description || null,
      isActive: segment.isActive,
      updatedAt: new Date(),
      version: 1,
    };

    const [existing] = await db
      .select()
      .from(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.id, segment.id),
          eq(schema.customerSegments.tenantId, tenantId)
        )
      );

    if (existing) {
      await db
        .update(schema.customerSegments)
        .set(raw)
        .where(
          and(
            eq(schema.customerSegments.id, segment.id),
            eq(schema.customerSegments.tenantId, tenantId)
          )
        );
    } else {
      await db.insert(schema.customerSegments).values({
        ...raw,
        createdAt: segment.createdAt,
        updatedAt: segment.createdAt,
      });
    }

    return segment;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.id, id),
          eq(schema.customerSegments.tenantId, tenantId)
        )
      );

    if (!existing) return false;

    await db
      .delete(schema.customerSegments)
      .where(
        and(
          eq(schema.customerSegments.id, id),
          eq(schema.customerSegments.tenantId, tenantId)
        )
      );

    return true;
  }
}
