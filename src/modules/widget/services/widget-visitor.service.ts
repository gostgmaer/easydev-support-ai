import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetVisitor } from '../domain/entities';
import { WidgetEventPublisher } from './widget-event.publisher';
import {
  WidgetVisitorCreatedEvent,
  WidgetVisitorIdentifiedEvent,
} from '@easydev/shared-events';
import { IdentifyVisitorDto } from '../dtos/widget.dto';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '@easydev/database';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class WidgetVisitorService {
  private readonly logger = new Logger(WidgetVisitorService.name);

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly eventPublisher: WidgetEventPublisher,
  ) {}

  async getOrCreateAnonymousVisitor(
    tenantId: string,
    anonymousId: string,
  ): Promise<WidgetVisitor> {
    let visitor = await this.widgetRepo.getVisitorByAnonymousId(
      tenantId,
      anonymousId,
    );
    if (!visitor) {
      visitor = new WidgetVisitor(uuidv4(), {
        tenantId,
        anonymousId,
        visitCount: 1,
      });
      await this.widgetRepo.saveVisitor(visitor);
      await this.eventPublisher.publish(
        new WidgetVisitorCreatedEvent(tenantId, visitor.id, anonymousId),
      );
    } else {
      visitor.incrementVisit();
      await this.widgetRepo.saveVisitor(visitor);
    }
    return visitor;
  }

  async identify(
    tenantId: string,
    dto: IdentifyVisitorDto,
  ): Promise<WidgetVisitor> {
    const visitor = await this.getOrCreateAnonymousVisitor(
      tenantId,
      dto.anonymousId,
    );

    // Identity Resolution
    // If an externalUserId is provided, search for existing identity or visitor
    let externalVisitor: WidgetVisitor | null = null;
    if (dto.externalUserId) {
      const identity = await this.widgetRepo.getIdentityByVisitor(
        tenantId,
        visitor.id,
      );
      if (!identity) {
        // Create verification identity link
        const newIdentity = {
          id: uuidv4(),
          tenantId,
          visitorId: visitor.id,
          externalUserId: dto.externalUserId,
          verificationMethod: dto.verificationMethod || 'HMAC',
          verifiedAt: new Date(),
        };
        await db.insert(schema.widgetIdentities).values(newIdentity);
      }
    }

    if (dto.email) {
      externalVisitor = await this.widgetRepo.getVisitorByEmail(
        tenantId,
        dto.email,
      );
    }

    if (externalVisitor && externalVisitor.id !== visitor.id) {
      // Merge visitors
      visitor.merge(externalVisitor);
      await this.widgetRepo.saveVisitor(visitor);
      // Soft-delete or mark other visitor as merged
      await db
        .update(schema.widgetVisitors)
        .set({ deletedAt: new Date() })
        .where(eq(schema.widgetVisitors.id, externalVisitor.id));
    }

    // Link customer in the modular monolith
    if (dto.email) {
      const [customerRow] = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.tenantId, tenantId),
            eq(schema.customers.email, dto.email),
          ),
        );

      if (customerRow) {
        visitor.linkCustomer(customerRow.id);
      }
    }

    visitor.update({
      email: dto.email || visitor.email,
      name: dto.name || visitor.name,
      phone: dto.phone || visitor.phone,
      country: dto.country || visitor.country,
      city: dto.city || visitor.city,
    });

    await this.widgetRepo.saveVisitor(visitor);

    await this.eventPublisher.publish(
      new WidgetVisitorIdentifiedEvent(
        tenantId,
        visitor.id,
        dto.externalUserId,
        dto.email,
      ),
    );

    return visitor;
  }
}
