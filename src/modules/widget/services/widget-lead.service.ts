import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import { WidgetLead } from '../domain/entities';
import { WidgetEventPublisher } from './widget-event.publisher';
import { WidgetLeadCreatedEvent } from '@easydev/shared-events';
import { CaptureLeadDto } from '../dtos/widget.dto';
import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '@easydev/database';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class WidgetLeadService {
  private readonly logger = new Logger(WidgetLeadService.name);

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly eventPublisher: WidgetEventPublisher,
  ) {}

  async captureLead(tenantId: string, dto: CaptureLeadDto): Promise<WidgetLead> {
    let lead = await this.widgetRepo.getLeadByEmail(tenantId, dto.email);
    if (!lead) {
      lead = new WidgetLead(uuidv4(), {
        tenantId,
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        company: dto.company,
        source: dto.source,
        leadScore: 0,
        status: 'NEW',
      });
    } else {
      lead.updateStatus('NEW');
    }

    // Lead Scoring
    let score = 0;
    if (dto.company) {
      score += 20;
    }
    if (dto.phone) {
      score += 15;
    }
    // Check if business email
    const nonBusinessDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com'];
    const emailDomain = dto.email.split('@')[1]?.toLowerCase();
    if (emailDomain && !nonBusinessDomains.includes(emailDomain)) {
      score += 30;
    }

    lead.qualify(score);
    await this.widgetRepo.saveLead(lead);

    // Lead Conversion: If qualified, create/sync customer in core customers table
    if (lead.status === 'QUALIFIED') {
      const [existingCustomer] = await db
        .select()
        .from(schema.customers)
        .where(and(
          eq(schema.customers.tenantId, tenantId),
          eq(schema.customers.email, dto.email)
        ));

      if (!existingCustomer) {
        const customerId = uuidv4();
        await db.insert(schema.customers).values({
          id: customerId,
          tenantId,
          email: dto.email,
          phone: dto.phone || null,
          status: 'ACTIVE',
          preferredLanguage: 'en',
          timezone: 'UTC',
          source: 'WIDGET',
          metadata: {
            convertedLeadId: lead.id,
            company: dto.company,
          },
        });

        // Create profile
        await db.insert(schema.customerProfiles).values({
          id: uuidv4(),
          tenantId,
          customerId,
          displayName: dto.name || dto.email.split('@')[0],
          company: dto.company || null,
        });
      }
    }

    await this.eventPublisher.publish(
      new WidgetLeadCreatedEvent(tenantId, lead.id, lead.email, lead.source)
    );

    return lead;
  }
}
