import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketAssignmentService } from './ticket-assignment.service';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';
import { InboxRealtimeService } from '../../inbox/services/inbox-realtime.service';
import { QueueService } from '@easydev/shared-queues';
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

function buildTicket(tenantId: string, id: string): Ticket {
  const t = Ticket.create(id, {
    tenantId,
    ticketNumber: TicketNumber.generate(1),
    priority: TicketPriority.create(TicketPriorityEnum.HIGH),
    status: TicketStatus.create(TicketStatusEnum.OPEN),
    source: TicketSource.create(TicketSourceEnum.MANUAL),
    subject: 'x',
  });
  t.clearEvents();
  return t;
}

describe('TicketAssignmentService', () => {
  let service: TicketAssignmentService;
  let repo: any;
  let engine: any;
  let audit: any;

  const tenantId = randomUUID();
  const ticketId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((t) => Promise.resolve(t)),
    addAssignment: jest.fn(),
    findAssignments: jest.fn(),
  };
  const mockEngine = { assignEntity: jest.fn() };
  const mockPublisher = { publishAll: jest.fn() };
  const mockAudit = { log: jest.fn() };
  const mockRealtime = { emitTicketUpdate: jest.fn() };
  const mockQueueService = { addJob: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketAssignmentService,
        { provide: 'ITicketRepository', useValue: mockRepo },
        { provide: AgentAssignmentService, useValue: mockEngine },
        { provide: TicketEventPublisher, useValue: mockPublisher },
        { provide: AuditService, useValue: mockAudit },
        { provide: InboxRealtimeService, useValue: mockRealtime },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get(TicketAssignmentService);
    repo = module.get('ITicketRepository');
    engine = module.get(AgentAssignmentService);
    audit = module.get(AuditService);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((t: any) => Promise.resolve(t));
  });

  it('assigns manually and records the assignment ledger entry', async () => {
    const ticket = buildTicket(tenantId, ticketId);
    mockRepo.findById.mockResolvedValue(ticket);
    const agentId = randomUUID();

    const result = await service.assign(
      tenantId,
      ticketId,
      agentId,
      undefined,
      'MANUAL',
      'user-1',
    );

    expect(result.assignedAgentId).toBe(agentId);
    expect(result.status.value).toBe(TicketStatusEnum.ASSIGNED);
    expect(repo.addAssignment).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TICKET_ASSIGN' }),
    );
  });

  it('delegates to the team engine for auto-assignment', async () => {
    const ticket = buildTicket(tenantId, ticketId);
    mockRepo.findById.mockResolvedValue(ticket);
    const teamId = randomUUID();
    const chosenAgent = randomUUID();
    mockEngine.assignEntity.mockResolvedValue(chosenAgent);

    const result = await service.autoAssign(
      tenantId,
      ticketId,
      teamId,
      'user-1',
    );

    expect(engine.assignEntity).toHaveBeenCalledWith(
      tenantId,
      teamId,
      ticketId,
      'TICKET',
      expect.objectContaining({ priority: expect.any(Number) }),
    );
    expect(result.assignedAgentId).toBe(chosenAgent);
  });

  it('transfers a ticket to another agent', async () => {
    const ticket = buildTicket(tenantId, ticketId);
    ticket.assign(randomUUID(), undefined, 'user-1');
    ticket.clearEvents();
    mockRepo.findById.mockResolvedValue(ticket);
    const toAgent = randomUUID();

    const result = await service.transfer(
      tenantId,
      ticketId,
      toAgent,
      'user-1',
    );

    expect(result.assignedAgentId).toBe(toAgent);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TICKET_TRANSFER' }),
    );
  });

  it('throws NotFound when the ticket is missing', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      service.assign(tenantId, ticketId, randomUUID()),
    ).rejects.toThrow(NotFoundException);
  });
});
