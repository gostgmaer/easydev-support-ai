import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService } from '@easydev/shared-queues';

import { InboxProjectionService } from '../services/inbox-projection.service';
import { InboxAssignmentService } from '../services/inbox-assignment.service';
import { InboxSnoozeService } from '../services/inbox-snooze.service';
import { InboxService } from '../services/inbox.service';
import { InboxEventPublisher } from '../services/inbox-event.publisher';
import { InboxRealtimeService } from '../services/inbox-realtime.service';
import { InboxActivityService } from '../services/inbox-activity.service';
import { InboxQueueProcessor } from '../jobs/inbox-queue.processor';
import { InboxEventConsumer } from '../consumers/inbox-event.consumer';
import { InboxSearchService } from '../services/inbox-search.service';
import { InboxPresenceService } from '../services/inbox-presence.service';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxSnooze } from '../domain/inbox-snooze.entity';
import { InboxFilter } from '../domain/inbox-filter.entity';
import {
  InboxStatus,
  InboxStatusEnum,
  InboxPriorityEnum,
} from '../domain/value-objects';

function buildView(tenantId: string, conversationId: string): InboxView {
  const v = new InboxView(randomUUID(), {
    tenantId,
    conversationId,
    status: InboxStatus.create(InboxStatusEnum.OPEN),
    priority: InboxPriorityEnum.MEDIUM,
  });
  return v;
}

const repoFactory = () => ({
  findViewByConversation: jest.fn(),
  saveView: jest.fn((v) => Promise.resolve(v)),
  listViews: jest.fn(),
  countByStatus: jest.fn(),
  saveFilter: jest.fn(),
  getFilter: jest.fn(),
  listFilters: jest.fn(),
  deleteFilter: jest.fn(),
  saveSavedView: jest.fn(),
  getSavedView: jest.fn(),
  listSavedViews: jest.fn(),
  deleteSavedView: jest.fn(),
  addAssignment: jest.fn(),
  findAssignments: jest.fn(),
  upsertPresence: jest.fn(),
  getPresence: jest.fn(),
  listOnlinePresence: jest.fn(),
  upsertSnooze: jest.fn(),
  getSnooze: jest.fn(),
  deleteSnooze: jest.fn(),
  findDueSnoozes: jest.fn(),
  addBookmark: jest.fn(),
  removeBookmark: jest.fn(),
  isBookmarked: jest.fn(),
  listBookmarks: jest.fn(),
  addActivity: jest.fn(),
  listActivity: jest.fn(),
});

const realtimeMock = {
  emitConversationUpdate: jest.fn(),
  emitMessageUpdate: jest.fn(),
  emitAssignmentUpdate: jest.fn(),
  emitPresenceUpdate: jest.fn(),
  emitStatusChange: jest.fn(),
  emitCounters: jest.fn(),
};

describe('InboxProjectionService', () => {
  let service: InboxProjectionService;
  let repo: any;

  beforeEach(async () => {
    repo = repoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxProjectionService,
        { provide: 'IInboxRepository', useValue: repo },
        { provide: InboxEventPublisher, useValue: { publishAll: jest.fn() } },
        { provide: InboxRealtimeService, useValue: realtimeMock },
      ],
    }).compile();
    service = module.get(InboxProjectionService);
    jest.clearAllMocks();
    repo.saveView.mockImplementation((v: any) => Promise.resolve(v));
  });

  it('creates a projection from a conversation event', async () => {
    repo.findViewByConversation.mockResolvedValue(null);
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    await service.projectConversation(tenantId, {
      conversationId,
      status: 'ACTIVE',
      priority: 'HIGH',
      customerId: randomUUID(),
    });
    expect(repo.saveView).toHaveBeenCalled();
    expect(realtimeMock.emitConversationUpdate).toHaveBeenCalled();
  });

  it('adjusts open ticket count without dropping below zero', async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const view = buildView(tenantId, conversationId);
    repo.findViewByConversation.mockResolvedValue(view);
    await service.adjustOpenTicketCount(tenantId, conversationId, -5);
    expect(view.openTicketCount).toBe(0);
  });

  it('projects an inbound message into the view', async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const view = buildView(tenantId, conversationId);
    repo.findViewByConversation.mockResolvedValue(view);
    await service.projectMessage(tenantId, {
      conversationId,
      content: 'hello',
      direction: 'INBOUND',
    });
    expect(view.unreadCount).toBe(1);
    expect(realtimeMock.emitMessageUpdate).toHaveBeenCalled();
  });
});

describe('InboxAssignmentService', () => {
  let service: InboxAssignmentService;
  let repo: any;
  let engine: any;

  beforeEach(async () => {
    repo = repoFactory();
    engine = { assignEntity: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxAssignmentService,
        { provide: 'IInboxRepository', useValue: repo },
        { provide: AgentAssignmentService, useValue: engine },
        { provide: InboxEventPublisher, useValue: { publish: jest.fn() } },
        { provide: InboxRealtimeService, useValue: realtimeMock },
        { provide: InboxActivityService, useValue: { record: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(InboxAssignmentService);
    jest.clearAllMocks();
    repo.saveView.mockImplementation((v: any) => Promise.resolve(v));
  });

  it('assigns and records the assignment ledger entry', async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    repo.findViewByConversation.mockResolvedValue(
      buildView(tenantId, conversationId),
    );
    const agentId = randomUUID();
    const result = await service.assign(
      tenantId,
      conversationId,
      agentId,
      undefined,
      'user-1',
    );
    expect(result.assignedAgentId).toBe(agentId);
    expect(repo.addAssignment).toHaveBeenCalled();
  });

  it('delegates round-robin to the team engine', async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const teamId = randomUUID();
    const chosen = randomUUID();
    repo.findViewByConversation.mockResolvedValue(
      buildView(tenantId, conversationId),
    );
    engine.assignEntity.mockResolvedValue(chosen);
    const result = await service.roundRobin(
      tenantId,
      conversationId,
      teamId,
      'user-1',
    );
    expect(engine.assignEntity).toHaveBeenCalledWith(
      tenantId,
      teamId,
      conversationId,
      'CONVERSATION',
      expect.objectContaining({ priority: expect.any(Number) }),
    );
    expect(result.assignedAgentId).toBe(chosen);
  });

  it('throws NotFound when the conversation view is missing', async () => {
    repo.findViewByConversation.mockResolvedValue(null);
    await expect(
      service.assign(randomUUID(), randomUUID(), randomUUID()),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('InboxSnoozeService', () => {
  let service: InboxSnoozeService;
  let repo: any;

  beforeEach(async () => {
    repo = repoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxSnoozeService,
        { provide: 'IInboxRepository', useValue: repo },
        { provide: InboxEventPublisher, useValue: { publish: jest.fn() } },
        { provide: InboxRealtimeService, useValue: realtimeMock },
        { provide: InboxActivityService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = module.get(InboxSnoozeService);
    jest.clearAllMocks();
    repo.saveView.mockImplementation((v: any) => Promise.resolve(v));
  });

  it('wakes due snoozes during the sweep', async () => {
    const tenantId = randomUUID();
    const conversationId = randomUUID();
    const snooze = new InboxSnooze(randomUUID(), {
      tenantId,
      conversationId,
      snoozedUntil: new Date(Date.now() - 1000),
    });
    repo.findDueSnoozes.mockResolvedValue([snooze]);
    const view = buildView(tenantId, conversationId);
    view.snooze();
    repo.findViewByConversation.mockResolvedValue(view);

    const result = await service.processDueSnoozes(tenantId);
    expect(result.woken).toBe(1);
    expect(repo.deleteSnooze).toHaveBeenCalled();
    expect(view.status.value).toBe(InboxStatusEnum.OPEN);
  });
});

describe('InboxService filters & saved views', () => {
  let service: InboxService;
  let repo: any;

  beforeEach(async () => {
    repo = repoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: 'IInboxRepository', useValue: repo },
        { provide: InboxEventPublisher, useValue: { publish: jest.fn(), publishAll: jest.fn() } },
        { provide: InboxActivityService, useValue: { record: jest.fn() } },
        { provide: InboxRealtimeService, useValue: realtimeMock },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(InboxService);
    jest.clearAllMocks();
  });

  it('creates a saved view when the filter exists', async () => {
    const tenantId = randomUUID();
    const userId = randomUUID();
    const filterId = randomUUID();
    repo.getFilter.mockResolvedValue(
      new InboxFilter(filterId, {
        tenantId,
        name: 'Mine',
        filterDefinition: { assignedAgentId: userId },
      }),
    );
    const view = await service.createSavedView(tenantId, userId, {
      name: 'My open',
      filterId,
    });
    expect(view.filterId).toBe(filterId);
    expect(repo.saveSavedView).toHaveBeenCalled();
  });

  it('rejects a saved view referencing a missing filter', async () => {
    repo.getFilter.mockResolvedValue(null);
    await expect(
      service.createSavedView(randomUUID(), randomUUID(), {
        name: 'x',
        filterId: randomUUID(),
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('InboxQueueProcessor', () => {
  let processor: InboxQueueProcessor;
  const consumer = { handleEvent: jest.fn() };
  const snooze = { processDueSnoozes: jest.fn() };
  const search = { invalidateTenant: jest.fn() };
  const presence = { setPresence: jest.fn(), heartbeat: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxQueueProcessor,
        { provide: InboxEventConsumer, useValue: consumer },
        { provide: InboxSnoozeService, useValue: snooze },
        { provide: InboxSearchService, useValue: search },
        { provide: InboxPresenceService, useValue: presence },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
      ],
    }).compile();
    processor = module.get(InboxQueueProcessor);
    jest.clearAllMocks();
  });

  it('routes inbox-projection-job to the consumer', async () => {
    const tenantId = randomUUID();
    await processor.handleJob({
      name: 'inbox-projection-job',
      id: 'j1',
      data: {
        _tenantContext: { tenantId },
        eventName: 'conversation.updated',
        aggregateId: randomUUID(),
      },
    } as any);
    expect(consumer.handleEvent).toHaveBeenCalled();
  });

  it('routes inbox-cleanup-job to the snooze sweep', async () => {
    snooze.processDueSnoozes.mockResolvedValue({ woken: 2 });
    const res = await processor.handleJob({
      name: 'inbox-cleanup-job',
      id: 'j2',
      data: {},
    } as any);
    expect(res.woken).toBe(2);
  });

  it('throws on an unknown job name', async () => {
    await expect(
      processor.handleJob({ name: 'nope', id: 'j3', data: {} } as any),
    ).rejects.toThrow('Unknown job name: nope');
  });
});
