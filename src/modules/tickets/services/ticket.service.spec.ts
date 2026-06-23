import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketService } from './ticket.service';
import { TicketEventPublisher } from './ticket-event.publisher';
import { TicketSLAService } from './ticket-sla.service';
import { CustomerService } from '../../customers/services/customer.service';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { Ticket } from '../domain/ticket.aggregate';
import {
  TicketNumber,
  TicketStatus,
  TicketStatusEnum,
  TicketPriority,
  TicketPriorityEnum,
  TicketSource,
  TicketSourceEnum,
} from '../domain/value-objects';
import { CreateTicketDto } from '../dtos';

function buildTicket(tenantId: string, id: string): Ticket {
  return Ticket.create(id, {
    tenantId,
    ticketNumber: TicketNumber.generate(1),
    customerId: randomUUID(),
    priority: TicketPriority.create(TicketPriorityEnum.MEDIUM),
    status: TicketStatus.create(TicketStatusEnum.OPEN),
    source: TicketSource.create(TicketSourceEnum.MANUAL),
    subject: 'Issue',
  });
}

describe('TicketService', () => {
  let service: TicketService;
  let repo: any;
  let sla: any;
  let customers: any;
  let queue: any;
  let audit: any;

  const tenantId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    findByNumber: jest.fn(),
    nextSequence: jest.fn().mockResolvedValue(1),
    save: jest.fn((t) => Promise.resolve(t)),
    delete: jest.fn().mockResolvedValue(true),
    findPaginated: jest.fn(),
    bulkUpdateStatus: jest.fn().mockResolvedValue(2),
  };
  const mockPublisher = { publish: jest.fn(), publishAll: jest.fn() };
  const mockSla = {
    configureForTicket: jest.fn(),
    refreshRemaining: jest.fn(),
  };
  const mockCustomers = {
    findById: jest.fn().mockResolvedValue({ id: 'cust' }),
  };
  const mockQueue = { addJob: jest.fn() };
  const mockAudit = { log: jest.fn() };
  const mockRealtime = { emitTicketUpdate: jest.fn() };
  const mockWorkflowEngineService = { evaluateEventTriggers: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        { provide: 'ITicketRepository', useValue: mockRepo },
        { provide: TicketEventPublisher, useValue: mockPublisher },
        { provide: TicketSLAService, useValue: mockSla },
        { provide: CustomerService, useValue: mockCustomers },
        { provide: QueueService, useValue: mockQueue },
        { provide: AuditService, useValue: mockAudit },
        { provide: InboxRealtimeService, useValue: mockRealtime },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngineService },
      ],
    }).compile();

    service = module.get(TicketService);
    repo = module.get('ITicketRepository');
    sla = module.get(TicketSLAService);
    customers = module.get(CustomerService);
    queue = module.get(QueueService);
    audit = module.get(AuditService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((t: any) => Promise.resolve(t));
    mockRepo.nextSequence.mockResolvedValue(1);
    mockCustomers.findById.mockResolvedValue({ id: 'cust' });
  });

  describe('create', () => {
    const dto: CreateTicketDto = { subject: 'Help', customerId: randomUUID() };

    it('validates the customer, assigns a number, configures SLA and audits', async () => {
      const result = await service.create(tenantId, dto, 'user-1');

      expect(customers.findById).toHaveBeenCalledWith(tenantId, dto.customerId);
      expect(result.ticketNumber.value).toBe('TKT-000001');
      expect(result.status.value).toBe(TicketStatusEnum.OPEN);
      expect(sla.configureForTicket).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TICKET_CREATE' }),
      );
    });

    it('enqueues auto-assignment when a team is set without an agent', async () => {
      const teamId = randomUUID();
      await service.create(tenantId, { ...dto, assignedTeamId: teamId });
      expect(queue.addJob).toHaveBeenCalledWith(
        'ticket-queue',
        'ticket-assignment-job',
        expect.objectContaining({ teamId }),
      );
    });

    it('starts ASSIGNED when an agent is provided', async () => {
      const result = await service.create(tenantId, {
        ...dto,
        assignedAgentId: randomUUID(),
      });
      expect(result.status.value).toBe(TicketStatusEnum.ASSIGNED);
    });
  });

  describe('lifecycle', () => {
    let ticket: Ticket;
    const id = randomUUID();

    beforeEach(() => {
      ticket = buildTicket(tenantId, id);
      ticket.clearEvents();
      mockRepo.findById.mockResolvedValue(ticket);
    });

    it('resolves a ticket and refreshes SLA', async () => {
      const result = await service.resolve(tenantId, id, 'done', 'agent-1');
      expect(result.status.value).toBe(TicketStatusEnum.RESOLVED);
      expect(sla.refreshRemaining).toHaveBeenCalledWith(tenantId, id);
    });

    it('reopens a ticket and reconfigures SLA', async () => {
      ticket.resolve('done');
      const result = await service.reopen(tenantId, id, 'agent-1');
      expect(result.status.value).toBe(TicketStatusEnum.REOPENED);
      expect(sla.configureForTicket).toHaveBeenCalled();
    });

    it('soft deletes a ticket', async () => {
      const ok = await service.delete(tenantId, id, 'agent-1');
      expect(ok).toBe(true);
      expect(repo.delete).toHaveBeenCalledWith(id, tenantId);
    });

    it('throws NotFound when the ticket is missing', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.resolve(tenantId, id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('merge', () => {
    it('closes the source and links it into the target', async () => {
      const sourceId = randomUUID();
      const targetId = randomUUID();
      const source = buildTicket(tenantId, sourceId);
      const target = buildTicket(tenantId, targetId);
      source.clearEvents();
      target.clearEvents();
      mockRepo.findById.mockImplementation((tid: string) =>
        Promise.resolve(
          tid === sourceId ? source : tid === targetId ? target : null,
        ),
      );

      const result = await service.merge(
        tenantId,
        sourceId,
        targetId,
        'agent-1',
      );

      expect(result.id).toBe(targetId);
      expect(source.status.value).toBe(TicketStatusEnum.CLOSED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TICKET_MERGE' }),
      );
    });
  });
});
