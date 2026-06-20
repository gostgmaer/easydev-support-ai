import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { TicketSLAService } from './ticket-sla.service';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
import { Ticket } from '../domain/ticket.aggregate';
import { TicketSLA } from '../domain/ticket-sla.entity';
import {
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketPriorityEnum,
  TicketSource,
  TicketSourceEnum,
} from '../domain/value-objects';
import {
  addBusinessMinutes,
  addCalendarMinutes,
  DEFAULT_BUSINESS_CALENDAR,
} from './business-hours';

function buildTicket(tenantId: string, id: string, openedAt: Date): Ticket {
  return new Ticket(id, {
    tenantId,
    ticketNumber: TicketNumber.generate(1),
    priority: TicketPriority.create(TicketPriorityEnum.HIGH),
    status: TicketStatus.create(TicketStatusEnum.OPEN),
    source: TicketSource.create(TicketSourceEnum.MANUAL),
    subject: 'x',
    openedAt,
  });
}

describe('business-hours calendar', () => {
  it('adds calendar minutes verbatim', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    expect(addCalendarMinutes(start, 60).toISOString()).toBe(
      '2026-06-01T01:00:00.000Z',
    );
  });

  it('skips non-working time when adding business minutes', () => {
    // Saturday 2026-06-06 12:00 UTC is outside the working calendar.
    const saturday = new Date('2026-06-06T12:00:00.000Z');
    const due = addBusinessMinutes(saturday, 30, DEFAULT_BUSINESS_CALENDAR);
    // Must land on the following Monday inside the business window.
    expect(due.getUTCDay()).toBe(1);
    expect(due.getUTCHours()).toBeGreaterThanOrEqual(
      DEFAULT_BUSINESS_CALENDAR.startHour,
    );
  });
});

describe('TicketSLAService', () => {
  let service: TicketSLAService;
  let repo: any;
  let queue: any;
  let publisher: any;

  const tenantId = randomUUID();

  const mockRepo = {
    getSla: jest.fn(),
    upsertSla: jest.fn(),
    findDueSlas: jest.fn(),
    findById: jest.fn(),
  };
  const mockQueue = { addJob: jest.fn() };
  const mockPublisher = { publish: jest.fn(), publishAll: jest.fn() };
  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketSLAService,
        { provide: 'ITicketRepository', useValue: mockRepo },
        { provide: QueueService, useValue: mockQueue },
        { provide: TicketEventPublisher, useValue: mockPublisher },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(TicketSLAService);
    repo = module.get('ITicketRepository');
    queue = module.get(QueueService);
    publisher = module.get(TicketEventPublisher);
    jest.clearAllMocks();
    mockRepo.getSla.mockResolvedValue(null);
  });

  it('derives response/resolution targets from priority and upserts', async () => {
    const openedAt = new Date('2026-06-01T00:00:00.000Z');
    const ticket = buildTicket(tenantId, randomUUID(), openedAt);

    const sla = await service.configureForTicket(tenantId, ticket);

    // HIGH priority defaults: response 60m, resolution 1440m (calendar mode).
    expect(sla.responseDueAt?.toISOString()).toBe('2026-06-01T01:00:00.000Z');
    expect(sla.resolutionDueAt?.toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(repo.upsertSla).toHaveBeenCalled();
  });

  it('flags breaches, emits sla.breached and enqueues escalation', async () => {
    const now = new Date('2026-06-10T00:00:00.000Z');
    const ticketId = randomUUID();
    const sla = new TicketSLA(randomUUID(), {
      tenantId,
      ticketId,
      resolutionDueAt: new Date('2026-06-09T00:00:00.000Z'),
      breached: false,
    });
    mockRepo.findDueSlas.mockResolvedValue([sla]);
    mockRepo.findById.mockResolvedValue(
      buildTicket(tenantId, ticketId, new Date('2026-06-08T00:00:00.000Z')),
    );

    const result = await service.runBreachSweep(tenantId, now);

    expect(result.breached).toBe(1);
    expect(sla.breached).toBe(true);
    expect(publisher.publish).toHaveBeenCalled();
    expect(queue.addJob).toHaveBeenCalledWith(
      'ticket-queue',
      'ticket-escalation-job',
      expect.objectContaining({ ticketId }),
    );
  });

  it('does not breach a resolved ticket', async () => {
    const now = new Date('2026-06-10T00:00:00.000Z');
    const ticketId = randomUUID();
    const sla = new TicketSLA(randomUUID(), {
      tenantId,
      ticketId,
      resolutionDueAt: new Date('2026-06-09T00:00:00.000Z'),
      breached: false,
    });
    const ticket = buildTicket(tenantId, ticketId, new Date('2026-06-08T00:00:00.000Z'));
    ticket.resolve('done');
    mockRepo.findDueSlas.mockResolvedValue([sla]);
    mockRepo.findById.mockResolvedValue(ticket);

    const result = await service.runBreachSweep(tenantId, now);

    expect(result.breached).toBe(0);
    expect(queue.addJob).not.toHaveBeenCalled();
  });
});
