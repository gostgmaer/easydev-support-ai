import { Test, TestingModule } from '@nestjs/testing';
import { TeamEventPublisher } from './team-event.publisher';
import { QueueService } from '@easydev/shared-queues';
import { DomainEvent } from '@easydev/shared-kernel';
import { randomUUID } from 'crypto';

class DummyEvent extends DomainEvent {
  static eventName = 'dummy.event';
  constructor(public readonly aggregateId: string) {
    super();
  }
  getAggregateId(): string {
    return this.aggregateId;
  }
}

class AgentAssignedDummyEvent extends DomainEvent {
  static eventName = 'agent.assigned';
  constructor(public readonly aggregateId: string) {
    super();
  }
  getAggregateId(): string {
    return this.aggregateId;
  }
}

describe('TeamEventPublisher', () => {
  let publisher: TeamEventPublisher;
  let queueService: any;

  const mockQueueService = {
    addJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamEventPublisher,
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    publisher = module.get<TeamEventPublisher>(TeamEventPublisher);
    queueService = module.get<QueueService>(QueueService);

    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should log and publish regular event without enqueuing load-balancer-job', async () => {
      const aggregateId = randomUUID();
      const event = new DummyEvent(aggregateId);

      await publisher.publish(event);

      expect(queueService.addJob).not.toHaveBeenCalled();
    });

    it('should enqueue load-balancer-job for agent.assigned events', async () => {
      const aggregateId = randomUUID();
      const event = new AgentAssignedDummyEvent(aggregateId);

      await publisher.publish(event);

      expect(queueService.addJob).toHaveBeenCalledWith(
        'team-queue',
        'load-balancer-job',
        { agentProfileId: aggregateId }
      );
    });

    it('should handle queue errors gracefully', async () => {
      const aggregateId = randomUUID();
      const event = new AgentAssignedDummyEvent(aggregateId);
      queueService.addJob.mockRejectedValue(new Error('Queue Error'));

      await expect(publisher.publish(event)).resolves.not.toThrow();
    });
  });

  describe('publishAll', () => {
    it('should publish all events in list', async () => {
      const aggregateId = randomUUID();
      const events = [new DummyEvent(aggregateId), new AgentAssignedDummyEvent(aggregateId)];

      await publisher.publishAll(events);

      expect(queueService.addJob).toHaveBeenCalledTimes(1);
    });
  });
});
