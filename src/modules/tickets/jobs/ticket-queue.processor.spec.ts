import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { TicketQueueProcessor } from './ticket-queue.processor';
import { TicketAssignmentService } from '../services/ticket-assignment.service';
import { TicketEscalationService } from '../services/ticket-escalation.service';
import { TicketSLAService } from '../services/ticket-sla.service';
import { QueueService } from '@easydev/shared-queues';

describe('TicketQueueProcessor', () => {
  let processor: TicketQueueProcessor;

  const mockAssignment = { autoAssign: jest.fn() };
  const mockEscalation = { escalate: jest.fn() };
  const mockSla = { runBreachSweep: jest.fn() };
  const mockQueue = { addJob: jest.fn() };

  const tenantId = randomUUID();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketQueueProcessor,
        { provide: TicketAssignmentService, useValue: mockAssignment },
        { provide: TicketEscalationService, useValue: mockEscalation },
        { provide: TicketSLAService, useValue: mockSla },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    processor = module.get(TicketQueueProcessor);
    jest.clearAllMocks();
  });

  it('routes ticket-assignment-job to auto-assign', async () => {
    const ticketId = randomUUID();
    const teamId = randomUUID();
    mockAssignment.autoAssign.mockResolvedValue({
      id: ticketId,
      assignedAgentId: 'a1',
    });
    const job: Partial<Job> = {
      name: 'ticket-assignment-job',
      id: 'j1',
      data: { ticketId, teamId, _tenantContext: { tenantId } },
    };
    const res = await processor.handleJob(job as any);
    expect(mockAssignment.autoAssign).toHaveBeenCalledWith(
      tenantId,
      ticketId,
      teamId,
      undefined,
    );
    expect(res.assignedAgentId).toBe('a1');
  });

  it('routes ticket-escalation-job to the escalation service', async () => {
    const ticketId = randomUUID();
    mockEscalation.escalate.mockResolvedValue({
      id: ticketId,
      priority: { value: 'HIGH' },
    });
    const job: Partial<Job> = {
      name: 'ticket-escalation-job',
      id: 'j2',
      data: {
        ticketId,
        reason: 'SLA_RESOLUTION_BREACH',
        _tenantContext: { tenantId },
      },
    };
    const res = await processor.handleJob(job as any);
    expect(mockEscalation.escalate).toHaveBeenCalledWith(
      tenantId,
      ticketId,
      'SLA_RESOLUTION_BREACH',
      expect.any(Object),
    );
    expect(res.priority).toBe('HIGH');
  });

  it('routes sla-monitor-job to the breach sweep', async () => {
    mockSla.runBreachSweep.mockResolvedValue({ breached: 3 });
    const job: Partial<Job> = {
      name: 'sla-monitor-job',
      id: 'j3',
      data: {},
    };
    const res = await processor.handleJob(job as any);
    expect(res.breached).toBe(3);
  });

  it('routes ticket-approval-job to the notification queue', async () => {
    const job: Partial<Job> = {
      name: 'ticket-approval-job',
      id: 'j4',
      data: {
        ticketId: randomUUID(),
        approvalId: 'ap1',
        approverId: randomUUID(),
        _tenantContext: { tenantId },
      },
    };
    const res = await processor.handleJob(job as any);
    expect(mockQueue.addJob).toHaveBeenCalledWith(
      'notification-queue',
      'approval-request',
      expect.objectContaining({ approvalId: 'ap1' }),
    );
    expect(res.notified).toBe(true);
  });

  it('forwards ticket-analytics-job to the analytics queue', async () => {
    const ticketId = randomUUID();
    const job: Partial<Job> = {
      name: 'ticket-analytics-job',
      id: 'j5',
      data: {
        ticketId,
        eventName: 'ticket.created',
        _tenantContext: { tenantId },
      },
    };
    const res = await processor.handleJob(job as any);
    expect(mockQueue.addJob).toHaveBeenCalledWith(
      'analytics-queue',
      'ticket-event',
      expect.objectContaining({ ticketId }),
    );
    expect(res.forwarded).toBe(true);
  });

  it('throws on an unknown job name', async () => {
    const job: Partial<Job> = {
      name: 'nope',
      id: 'j6',
      data: { _tenantContext: { tenantId } },
    };
    await expect(processor.handleJob(job as any)).rejects.toThrow(
      'Unknown job name: nope',
    );
  });
});
