import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { SlaBreachedEvent } from '@easydev/shared-events';
import type { ITicketRepository } from '../repositories/ticket-repository.interface';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketSLA } from '../domain/ticket-sla.entity';
import { TicketPriorityEnum } from '../domain/value-objects';
import { ConfigureSlaDto } from '../dtos';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { addBusinessMinutes, addCalendarMinutes, DEFAULT_BUSINESS_CALENDAR } from './business-hours';
import { SlaSettingsService } from '../../settings/services/sla-settings.service';
import { HolidayService } from '../../settings/services/holiday.service';

interface SlaTarget {
  responseMinutes: number;
  resolutionMinutes: number;
}

// Default SLA matrix per priority (minutes). Tunable via SLA policies.
const DEFAULT_SLA_MATRIX: Record<TicketPriorityEnum, SlaTarget> = {
  [TicketPriorityEnum.LOW]: { responseMinutes: 480, resolutionMinutes: 5760 },
  [TicketPriorityEnum.MEDIUM]: {
    responseMinutes: 240,
    resolutionMinutes: 2880,
  },
  [TicketPriorityEnum.HIGH]: { responseMinutes: 60, resolutionMinutes: 1440 },
  [TicketPriorityEnum.URGENT]: { responseMinutes: 30, resolutionMinutes: 480 },
  [TicketPriorityEnum.CRITICAL]: {
    responseMinutes: 15,
    resolutionMinutes: 240,
  },
};

const SLA_SWEEP_BATCH = 500;

@Injectable()
export class TicketSLAService {
  private readonly logger = new Logger(TicketSLAService.name);

  constructor(
    @Inject('ITicketRepository')
    private readonly ticketRepo: ITicketRepository,
    private readonly queueService: QueueService,
    private readonly eventPublisher: TicketEventPublisher,
    private readonly auditService: AuditService,
    private readonly slaSettingsService: SlaSettingsService,
    private readonly holidayService: HolidayService,
  ) {}

  /**
   * Initializes (or reconfigures) the SLA clock for a ticket. Targets come from
   * the priority matrix unless explicitly overridden, and are projected through
   * a business-hours calendar when requested.
   */
  async configureForTicket(
    tenantId: string,
    ticket: Ticket,
    dto: ConfigureSlaDto = {},
  ): Promise<TicketSLA> {
    const matrix = DEFAULT_SLA_MATRIX[ticket.priority.value];
    const tenantSla = await this.slaSettingsService.getSlaSettings(tenantId);

    // The settings UI only exposes one target pair, not a full per-priority
    // matrix - so a tenant's configured values replace the matrix's MEDIUM
    // (baseline) tier specifically. Other priorities keep their relative
    // tiering from the matrix untouched, since there's nothing in the
    // settings model that says how to rescale them.
    const isBaselinePriority =
      ticket.priority.value === TicketPriorityEnum.MEDIUM;
    const defaultResponseMinutes = isBaselinePriority
      ? Math.round(tenantSla.responseTimeTarget / 60)
      : matrix.responseMinutes;
    const defaultResolutionMinutes = isBaselinePriority
      ? Math.round(tenantSla.resolutionTimeTarget / 60)
      : matrix.resolutionMinutes;

    const responseMinutes = dto.responseMinutes ?? defaultResponseMinutes;
    const resolutionMinutes = dto.resolutionMinutes ?? defaultResolutionMinutes;
    const businessHours = dto.businessHours ?? tenantSla.businessHoursOnly;
    const base = ticket.openedAt;

    let calendar = DEFAULT_BUSINESS_CALENDAR;
    if (businessHours) {
      const dbHolidays = await this.holidayService.getHolidays(tenantId);
      if (dbHolidays.length > 0) {
        calendar = {
          ...DEFAULT_BUSINESS_CALENDAR,
          holidays: new Set([
            ...DEFAULT_BUSINESS_CALENDAR.holidays,
            ...dbHolidays.map((h) => h.holidayDate.toISOString().slice(0, 10)),
          ]),
        };
      }
    }

    const responseDueAt = businessHours
      ? addBusinessMinutes(base, responseMinutes, calendar)
      : addCalendarMinutes(base, responseMinutes);
    const resolutionDueAt = businessHours
      ? addBusinessMinutes(base, resolutionMinutes, calendar)
      : addCalendarMinutes(base, resolutionMinutes);

    const existing = await this.ticketRepo.getSla(tenantId, ticket.id);
    const sla = new TicketSLA(existing?.id || randomUUID(), {
      tenantId,
      ticketId: ticket.id,
      policyId: dto.policyId ?? existing?.policyId,
      responseDueAt,
      resolutionDueAt,
      breached: existing?.breached ?? false,
      breachedAt: existing?.breachedAt,
      pausedAt: existing?.pausedAt,
      pausedSeconds: existing?.pausedSeconds ?? 0,
      createdAt: existing?.createdAt,
    });
    sla.recalculateRemaining();

    await this.ticketRepo.upsertSla(sla, tenantId);
    return sla;
  }

  async getForTicket(tenantId: string, ticketId: string): Promise<TicketSLA> {
    const sla = await this.ticketRepo.getSla(tenantId, ticketId);
    if (!sla) {
      throw new NotFoundException(`No SLA configured for ticket ${ticketId}`);
    }
    return sla;
  }

  async refreshRemaining(tenantId: string, ticketId: string): Promise<void> {
    const sla = await this.ticketRepo.getSla(tenantId, ticketId);
    if (!sla || sla.breached) return;
    sla.recalculateRemaining();
    await this.ticketRepo.upsertSla(sla, tenantId);
  }

  /**
   * Pauses the SLA clock for a ticket. Called when a ticket enters a state
   * where the agent is waiting (e.g. WAITING_CUSTOMER, APPROVAL_PENDING).
   * Safe to call when already paused — the entity no-ops it.
   */
  async pauseSlaForTicket(tenantId: string, ticketId: string): Promise<void> {
    const sla = await this.ticketRepo.getSla(tenantId, ticketId);
    if (!sla || sla.breached) return;
    sla.pause();
    await this.ticketRepo.upsertSla(sla, tenantId);
    this.logger.log(`SLA paused for ticket ${ticketId}`);
  }

  /**
   * Resumes the SLA clock for a ticket. Called when a ticket transitions back
   * to an active state from a waiting state. Shifts deadlines forward by the
   * elapsed pause window so agents aren't penalised.
   */
  async resumeSlaForTicket(tenantId: string, ticketId: string): Promise<void> {
    const sla = await this.ticketRepo.getSla(tenantId, ticketId);
    if (!sla || sla.breached) return;
    sla.resume();
    sla.recalculateRemaining();
    await this.ticketRepo.upsertSla(sla, tenantId);
    this.logger.log(`SLA resumed for ticket ${ticketId}`);
  }

  /**
   * High-throughput breach sweep. Invoked by the sla-monitor-job. Marks breached
   * SLAs, emits sla.breached and enqueues automatic escalation.
   */
  async runBreachSweep(
    tenantId?: string,
    now: Date = new Date(),
  ): Promise<{ breached: number }> {
    const dueSlas = await this.ticketRepo.findDueSlas(
      tenantId,
      now,
      SLA_SWEEP_BATCH,
    );
    let breached = 0;

    for (const sla of dueSlas) {
      const ticket = await this.ticketRepo.findById(sla.ticketId, sla.tenantId);
      if (!ticket) continue;

      const resolved = ticket.status.isResolved() || ticket.status.isTerminal();
      const responded = !!ticket.firstResponseAt;
      const breachType = sla.detectBreach(now, responded, resolved);
      if (!breachType) continue;

      sla.markBreached(now);
      await this.ticketRepo.upsertSla(sla, sla.tenantId);

      await this.eventPublisher.publish(
        new SlaBreachedEvent(sla.tenantId, ticket.id, sla.id, breachType),
      );

      await this.queueService.addJob(QUEUES.TICKET, 'ticket-escalation-job', {
        ticketId: ticket.id,
        tenantId: sla.tenantId,
        reason: `SLA_${breachType}_BREACH`,
      });

      // NotificationQueueProcessor already had a fully-built 'sla-breach'
      // case (push to the assigned agent, email to a manager) with no
      // producer anywhere - the breach was tracked and escalated internally
      // but nobody outside the system was ever actually alerted.
      if (ticket.assignedAgentId) {
        await this.queueService.addJob(QUEUES.NOTIFICATION, 'sla-breach', {
          tenantId: sla.tenantId,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber.value,
          breachType,
          agentId: ticket.assignedAgentId,
        });
      }

      await this.auditService.log({
        tenantId: sla.tenantId,
        action: 'SLA_BREACH',
        details: `Ticket ${ticket.id} breached ${breachType} SLA`,
      });

      breached += 1;
    }

    if (breached > 0) {
      this.logger.warn(`SLA sweep flagged ${breached} breach(es)`);
    }
    return { breached };
  }
}
