import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TicketApprovalService } from './ticket-approval.service';
import { TicketEventPublisher } from './ticket-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { Ticket } from '../domain/ticket.aggregate';
import {
  TicketApproval,
  ApprovalTypeEnum,
} from '../domain/ticket-approval.entity';
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
    priority: TicketPriority.create(TicketPriorityEnum.MEDIUM),
    status: TicketStatus.create(TicketStatusEnum.APPROVAL_PENDING),
    source: TicketSource.create(TicketSourceEnum.MANUAL),
    subject: 'Refund request',
  });
  t.clearEvents();
  return t;
}

describe('TicketApprovalService', () => {
  let service: TicketApprovalService;
  let repo: any;
  let publisher: any;

  const tenantId = randomUUID();
  const ticketId = randomUUID();

  const mockRepo = {
    findById: jest.fn(),
    save: jest.fn((t) => Promise.resolve(t)),
    saveApproval: jest.fn(),
    getApproval: jest.fn(),
    findApprovals: jest.fn(),
  };
  const mockPublisher = { publish: jest.fn(), publishAll: jest.fn() };
  const mockAudit = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketApprovalService,
        { provide: 'ITicketRepository', useValue: mockRepo },
        { provide: TicketEventPublisher, useValue: mockPublisher },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(TicketApprovalService);
    repo = module.get('ITicketRepository');
    publisher = module.get(TicketEventPublisher);
    jest.clearAllMocks();
    mockRepo.save.mockImplementation((t: any) => Promise.resolve(t));
  });

  it('requests an approval and moves the ticket to APPROVAL_PENDING', async () => {
    const ticket = Ticket.create(ticketId, {
      tenantId,
      ticketNumber: TicketNumber.generate(1),
      priority: TicketPriority.create(TicketPriorityEnum.MEDIUM),
      status: TicketStatus.create(TicketStatusEnum.IN_PROGRESS),
      source: TicketSource.create(TicketSourceEnum.MANUAL),
      subject: 'Refund',
    });
    ticket.clearEvents();
    mockRepo.findById.mockResolvedValue(ticket);

    const approval = await service.request(
      tenantId,
      ticketId,
      { approverId: randomUUID(), type: ApprovalTypeEnum.REFUND },
      'user-1',
    );

    expect(approval.status).toBe('PENDING');
    expect(ticket.status.value).toBe(TicketStatusEnum.APPROVAL_PENDING);
  });

  it('approves an approval, resumes the ticket and emits ticket.approved', async () => {
    const approval = new TicketApproval(randomUUID(), {
      tenantId,
      ticketId,
      approverId: randomUUID(),
      status: 'PENDING',
      type: ApprovalTypeEnum.REFUND,
    });
    mockRepo.getApproval.mockResolvedValue(approval);
    const ticket = buildTicket(tenantId, ticketId);
    mockRepo.findById.mockResolvedValue(ticket);

    const result = await service.approve(tenantId, approval.id, {}, 'user-1');

    expect(result.status).toBe('APPROVED');
    expect(repo.saveApproval).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalled();
    // No pending approvals remain → ticket resumes to IN_PROGRESS.
    expect(ticket.status.value).toBe(TicketStatusEnum.IN_PROGRESS);
  });

  it('rejects an approval and emits ticket.rejected', async () => {
    const approval = new TicketApproval(randomUUID(), {
      tenantId,
      ticketId,
      approverId: randomUUID(),
      status: 'PENDING',
      type: ApprovalTypeEnum.CREDIT,
    });
    mockRepo.getApproval.mockResolvedValue(approval);
    mockRepo.findById.mockResolvedValue(buildTicket(tenantId, ticketId));

    const result = await service.reject(
      tenantId,
      approval.id,
      { comments: 'not allowed' },
      'user-1',
    );

    expect(result.status).toBe('REJECTED');
  });

  it('throws NotFound for a missing approval', async () => {
    mockRepo.getApproval.mockResolvedValue(null);
    await expect(service.approve(tenantId, randomUUID(), {})).rejects.toThrow(
      NotFoundException,
    );
  });
});
