import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { QueueService } from '../src/queue.service';
import {
  QUEUES,
  RETRY_POLICIES,
  DEFAULT_JOB_OPTIONS,
  DEAD_LETTER_JOB_OPTIONS,
} from '../src/queue-definitions';

describe('queue-definitions', () => {
  it('registers a dedicated dead-letter queue', () => {
    expect(QUEUES.DEAD_LETTER).toBe('dead-letter-queue');
  });

  it('exposes retry policies with increasing aggressiveness', () => {
    expect(RETRY_POLICIES.DEFAULT.attempts).toBe(3);
    expect(RETRY_POLICIES.CRITICAL.attempts).toBe(5);
    expect(RETRY_POLICIES.NONE.attempts).toBe(1);
  });

  it('never retries dead-letter jobs and retains them', () => {
    expect(DEAD_LETTER_JOB_OPTIONS.attempts).toBe(1);
    expect(DEAD_LETTER_JOB_OPTIONS.removeOnFail).toBe(false);
    expect(DEFAULT_JOB_OPTIONS.removeOnComplete).toBe(true);
  });
});

describe('QueueService.moveToDeadLetter', () => {
  function buildService() {
    const add = jest.fn().mockResolvedValue({ id: 'dlq-1' });
    const fakeQueue = { add } as unknown;
    const moduleRef = {
      get: jest.fn().mockReturnValue(fakeQueue),
    } as unknown as ModuleRef;
    return { service: new QueueService(moduleRef), add };
  }

  it('routes a failed job into the dead-letter queue with full metadata', async () => {
    const { service, add } = buildService();

    const job = {
      id: 'job-99',
      name: 'audit-event',
      attemptsMade: 3,
      data: { foo: 'bar', _tenantContext: { tenantId: 'tenant-x' } },
      opts: { attempts: 3 },
    } as unknown as Job;

    const result = await service.moveToDeadLetter(
      QUEUES.ANALYTICS,
      job,
      new Error('boom'),
    );

    expect(result).toEqual({ id: 'dlq-1' });
    expect(add).toHaveBeenCalledTimes(1);

    const [jobName, payload, opts] = add.mock.calls[0];
    expect(jobName).toBe('dead:analytics-queue:audit-event');
    expect(payload).toMatchObject({
      sourceQueue: QUEUES.ANALYTICS,
      jobName: 'audit-event',
      originalJobId: 'job-99',
      attemptsMade: 3,
      failedReason: 'boom',
      tenantId: 'tenant-x',
      data: { foo: 'bar', _tenantContext: { tenantId: 'tenant-x' } },
    });
    expect(typeof payload.failedAt).toBe('string');
    expect(opts.attempts).toBe(1);
  });
});
