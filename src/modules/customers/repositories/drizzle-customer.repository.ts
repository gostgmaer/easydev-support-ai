import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, or, ilike, sql, desc, asc } from 'drizzle-orm';
import { Customer } from '../domain/customer.aggregate';
import {
  ICustomerRepository,
  CustomerQueryOptions,
} from './customer-repository.interface';
import { CustomerMapper } from './customer.mapper';
import { randomUUID } from 'crypto';

@Injectable()
export class DrizzleCustomerRepository implements ICustomerRepository {
  async findById(id: string, tenantId: string): Promise<Customer | null> {
    const [row] = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return CustomerMapper.toDomain(row.customer, row.profile, row.metrics);
  }

  async findByEmail(email: string, tenantId: string): Promise<Customer | null> {
    const [row] = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.email, email.trim().toLowerCase()),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return CustomerMapper.toDomain(row.customer, row.profile, row.metrics);
  }

  async findByExternalId(
    externalId: string,
    tenantId: string,
  ): Promise<Customer | null> {
    const [row] = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.externalCustomerId, externalId),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    if (!row) return null;
    return CustomerMapper.toDomain(row.customer, row.profile, row.metrics);
  }

  async findAll(tenantId: string): Promise<Customer[]> {
    const rows = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          sql`${schema.customers.deletedAt} IS NULL`,
        ),
      );

    return rows.map((r) =>
      CustomerMapper.toDomain(r.customer, r.profile, r.metrics),
    );
  }

  async save(customer: Customer, tenantId: string): Promise<Customer> {
    const rawCustomer = {
      id: customer.id,
      tenantId: customer.tenantId,
      externalCustomerId: customer.externalCustomerId || null,
      email: customer.email.value,
      phone: customer.phone?.value || null,
      status: customer.status.value,
      preferredLanguage: customer.preferredLanguage.value,
      timezone: customer.timezone.value,
      lastSeenAt: customer.lastSeenAt || null,
      source: customer.source,
      metadata: customer.metadata || null,
      updatedAt: new Date(),
      deletedAt: customer.deletedAt || null,
      version: customer.version,
    };

    await db.transaction(async (tx) => {
      // 1. Save customer
      const [existing] = await tx
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.id, customer.id),
            eq(schema.customers.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.customers)
          .set({ ...rawCustomer, updatedAt: new Date() })
          .where(
            and(
              eq(schema.customers.id, customer.id),
              eq(schema.customers.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.customers).values({
          ...rawCustomer,
          createdAt: customer.createdAt,
          updatedAt: customer.createdAt,
        });
      }

      // 2. Save profile
      if (customer.profile) {
        const rawProfile = {
          id: customer.profile.id,
          tenantId: customer.profile.tenantId,
          customerId: customer.profile.customerId,
          firstName: customer.profile.firstName || null,
          lastName: customer.profile.lastName || null,
          displayName: customer.profile.displayName || null,
          avatarUrl: customer.profile.avatarUrl || null,
          company: customer.profile.company || null,
          jobTitle: customer.profile.jobTitle || null,
          country: customer.profile.country || null,
          city: customer.profile.city || null,
          state: customer.profile.state || null,
          postalCode: customer.profile.postalCode || null,
          tags: customer.profile.tags || null,
          customAttributes: customer.profile.customAttributes || null,
          updatedAt: new Date(),
        };

        const [existingProfile] = await tx
          .select()
          .from(schema.customerProfiles)
          .where(
            and(
              eq(schema.customerProfiles.customerId, customer.id),
              eq(schema.customerProfiles.tenantId, tenantId),
            ),
          );

        if (existingProfile) {
          await tx
            .update(schema.customerProfiles)
            .set(rawProfile)
            .where(
              and(
                eq(schema.customerProfiles.customerId, customer.id),
                eq(schema.customerProfiles.tenantId, tenantId),
              ),
            );
        } else {
          await tx.insert(schema.customerProfiles).values({
            ...rawProfile,
            createdAt: customer.profile.createdAt,
            updatedAt: customer.profile.createdAt,
          });
        }
      }

      // 3. Save metrics
      if (customer.metrics) {
        const rawMetrics = {
          id: customer.metrics.id,
          tenantId: customer.metrics.tenantId,
          customerId: customer.metrics.customerId,
          totalConversations: customer.metrics.totalConversations,
          totalTickets: customer.metrics.totalTickets,
          totalOrders: customer.metrics.totalOrders,
          totalSpend: customer.metrics.totalSpend.toFixed(2),
          averageCsat: customer.metrics.averageCsat,
          averageResponseTime: customer.metrics.averageResponseTime,
          averageResolutionTime: customer.metrics.averageResolutionTime,
          sentimentScore: customer.metrics.sentimentScore,
          lifetimeValue: customer.metrics.lifetimeValue.toFixed(2),
          riskScore: customer.metrics.riskScore,
          vipStatus: customer.metrics.vipStatus,
          updatedAt: new Date(),
        };

        const [existingMetrics] = await tx
          .select()
          .from(schema.customerMetrics)
          .where(
            and(
              eq(schema.customerMetrics.customerId, customer.id),
              eq(schema.customerMetrics.tenantId, tenantId),
            ),
          );

        if (existingMetrics) {
          await tx
            .update(schema.customerMetrics)
            .set(rawMetrics)
            .where(
              and(
                eq(schema.customerMetrics.customerId, customer.id),
                eq(schema.customerMetrics.tenantId, tenantId),
              ),
            );
        } else {
          await tx.insert(schema.customerMetrics).values({
            ...rawMetrics,
            createdAt: customer.metrics.createdAt,
            updatedAt: customer.metrics.createdAt,
          });
        }
      }
    });

    return customer;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .update(schema.customers)
      .set({
        deletedAt: new Date(),
        status: 'INACTIVE',
      })
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    return true;
  }

  async restore(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    if (!existing) return false;

    await db
      .update(schema.customers)
      .set({
        deletedAt: null,
        status: 'ACTIVE',
      })
      .where(
        and(
          eq(schema.customers.id, id),
          eq(schema.customers.tenantId, tenantId),
        ),
      );

    return true;
  }

  async findPaginated(
    tenantId: string,
    options: CustomerQueryOptions,
  ): Promise<{ data: Customer[]; total: number; nextCursor?: string }> {
    const limit = options.limit || 20;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.customers.tenantId, tenantId),
      sql`${schema.customers.deletedAt} IS NULL`,
    ];

    if (options.status) {
      conditions.push(eq(schema.customers.status, options.status));
    }
    if (options.email) {
      conditions.push(
        eq(schema.customers.email, options.email.trim().toLowerCase()),
      );
    }
    if (options.phone) {
      conditions.push(eq(schema.customers.phone, options.phone.trim()));
    }
    if (options.vipStatus !== undefined) {
      conditions.push(eq(schema.customerMetrics.vipStatus, options.vipStatus));
    }
    if (options.search) {
      const searchPattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(schema.customers.email, searchPattern),
          ilike(schema.customers.phone, searchPattern),
          ilike(schema.customerProfiles.firstName, searchPattern),
          ilike(schema.customerProfiles.lastName, searchPattern),
          ilike(schema.customerProfiles.displayName, searchPattern),
          ilike(schema.customerProfiles.company, searchPattern),
        ),
      );
    }

    if (options.cursor) {
      conditions.push(sql`${schema.customers.id} > ${options.cursor}`);
    }

    const whereClause = and(...conditions);

    let orderByColumn: any = schema.customers.createdAt;
    if (options.sortBy) {
      if (options.sortBy === 'name') {
        orderByColumn = schema.customerProfiles.displayName;
      } else if (options.sortBy === 'email') {
        orderByColumn = schema.customers.email;
      } else if (options.sortBy === 'lastSeenAt') {
        orderByColumn = schema.customers.lastSeenAt;
      } else if (options.sortBy === 'totalSpend') {
        orderByColumn = schema.customerMetrics.totalSpend;
      }
    }
    const order =
      options.sortOrder === 'DESC' ? desc(orderByColumn) : asc(orderByColumn);

    let query = db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      );

    if (options.segmentId) {
      query = query.innerJoin(
        schema.customerSegmentMembers,
        and(
          eq(schema.customers.id, schema.customerSegmentMembers.customerId),
          eq(schema.customerSegmentMembers.segmentId, options.segmentId),
        ),
      );
    }

    const dataRows = await (query as any)
      .where(whereClause)
      .orderBy(order)
      .limit(limit)
      .offset(offset);

    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      );

    if (options.segmentId) {
      countQuery = countQuery.innerJoin(
        schema.customerSegmentMembers,
        and(
          eq(schema.customers.id, schema.customerSegmentMembers.customerId),
          eq(schema.customerSegmentMembers.segmentId, options.segmentId),
        ),
      );
    }

    const [countResult] = await (countQuery as any).where(whereClause);
    const total = Number(countResult?.count || 0);

    const data = dataRows.map((r: any) =>
      CustomerMapper.toDomain(r.customer, r.profile, r.metrics),
    );

    let nextCursor: string | undefined;
    if (data.length > 0 && data.length === limit) {
      nextCursor = data[data.length - 1].id;
    }

    return { data, total, nextCursor };
  }

  async search(
    tenantId: string,
    queryText: string,
    limit = 10,
  ): Promise<Customer[]> {
    const searchPattern = `%${queryText}%`;
    const rows = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          sql`${schema.customers.deletedAt} IS NULL`,
          or(
            ilike(schema.customers.email, searchPattern),
            ilike(schema.customers.phone, searchPattern),
            ilike(schema.customerProfiles.firstName, searchPattern),
            ilike(schema.customerProfiles.lastName, searchPattern),
            ilike(schema.customerProfiles.displayName, searchPattern),
          ),
        ),
      )
      .limit(limit);

    return rows.map((r) =>
      CustomerMapper.toDomain(r.customer, r.profile, r.metrics),
    );
  }

  async assignSegment(
    customerId: string,
    segmentId: string,
    tenantId: string,
  ): Promise<void> {
    const [existing] = await db
      .select()
      .from(schema.customerSegmentMembers)
      .where(
        and(
          eq(schema.customerSegmentMembers.customerId, customerId),
          eq(schema.customerSegmentMembers.segmentId, segmentId),
          eq(schema.customerSegmentMembers.tenantId, tenantId),
        ),
      );

    if (!existing) {
      await db.insert(schema.customerSegmentMembers).values({
        id: randomUUID(),
        tenantId,
        customerId,
        segmentId,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });
    }
  }

  async removeSegment(
    customerId: string,
    segmentId: string,
    tenantId: string,
  ): Promise<void> {
    await db
      .delete(schema.customerSegmentMembers)
      .where(
        and(
          eq(schema.customerSegmentMembers.customerId, customerId),
          eq(schema.customerSegmentMembers.segmentId, segmentId),
          eq(schema.customerSegmentMembers.tenantId, tenantId),
        ),
      );
  }

  async findSegments(customerId: string, tenantId: string): Promise<string[]> {
    const rows = await db
      .select({ segmentId: schema.customerSegmentMembers.segmentId })
      .from(schema.customerSegmentMembers)
      .where(
        and(
          eq(schema.customerSegmentMembers.customerId, customerId),
          eq(schema.customerSegmentMembers.tenantId, tenantId),
        ),
      );

    return rows.map((r) => r.segmentId);
  }

  async findSegmentMembers(
    segmentId: string,
    tenantId: string,
  ): Promise<Customer[]> {
    const rows = await db
      .select({
        customer: schema.customers,
        profile: schema.customerProfiles,
        metrics: schema.customerMetrics,
      })
      .from(schema.customers)
      .innerJoin(
        schema.customerSegmentMembers,
        and(
          eq(schema.customers.id, schema.customerSegmentMembers.customerId),
          eq(schema.customerSegmentMembers.segmentId, segmentId),
        ),
      )
      .leftJoin(
        schema.customerProfiles,
        eq(schema.customers.id, schema.customerProfiles.customerId),
      )
      .leftJoin(
        schema.customerMetrics,
        eq(schema.customers.id, schema.customerMetrics.customerId),
      )
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          sql`${schema.customers.deletedAt} IS NULL`,
        ),
      );

    return rows.map((r) =>
      CustomerMapper.toDomain(r.customer, r.profile, r.metrics),
    );
  }
}
