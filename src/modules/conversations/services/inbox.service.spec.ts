import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { InboxService } from './inbox.service';
import { RedisCacheService } from './redis-cache.service';
import { ConversationSummary } from '../domain/conversation-summary.entity';

describe('InboxService', () => {
  let service: InboxService;
  let repo: any;
  let cache: any;

  const tenantId = randomUUID();

  const mockRepo = {
    findInbox: jest.fn(),
    countUnread: jest.fn(),
  };
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxService,
        { provide: 'IConversationRepository', useValue: mockRepo },
        { provide: RedisCacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get(InboxService);
    repo = module.get('IConversationRepository');
    cache = module.get(RedisCacheService);
    jest.clearAllMocks();
  });

  it('returns the cached payload without touching the database on a cache hit', async () => {
    const cached = { data: [{ id: 'x' }], total: 1, nextCursor: undefined };
    mockCache.get.mockResolvedValue(cached);

    const result = await service.listInbox(tenantId, {});

    expect(result).toBe(cached);
    expect(repo.findInbox).not.toHaveBeenCalled();
  });

  it('reads the summary read model and populates the cache on a miss', async () => {
    mockCache.get.mockResolvedValue(null);
    const summary = new ConversationSummary(randomUUID(), {
      tenantId,
      conversationId: randomUUID(),
      unreadCount: 2,
      totalMessages: 5,
      totalAttachments: 0,
      sentimentScore: 0,
    });
    mockRepo.findInbox.mockResolvedValue({
      data: [summary],
      total: 1,
      nextCursor: 'c1',
    });

    const result = await service.listInbox(tenantId, { status: 'OPEN' });

    expect(repo.findInbox).toHaveBeenCalledWith(tenantId, { status: 'OPEN' });
    expect(result.total).toBe(1);
    expect(result.data[0].conversationId).toBe(summary.conversationId);
    expect(cache.set).toHaveBeenCalled();
  });

  it('scopes my-conversations to the agent', async () => {
    mockCache.get.mockResolvedValue(null);
    mockRepo.findInbox.mockResolvedValue({ data: [], total: 0 });
    const agentId = randomUUID();

    await service.myConversations(tenantId, agentId, {});

    expect(repo.findInbox).toHaveBeenCalledWith(tenantId, {
      assignedAgentId: agentId,
    });
  });

  it('aggregates unread counts from the read model', async () => {
    mockRepo.countUnread.mockResolvedValue(7);
    const result = await service.unreadCount(tenantId, {});
    expect(result).toEqual({ unread: 7 });
  });
});
