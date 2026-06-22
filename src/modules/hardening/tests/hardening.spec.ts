import { Test, TestingModule } from '@nestjs/testing';
import {
  CircuitBreaker,
  CircuitState,
} from '../../../common/resilience/circuit-breaker';
import { EncryptionService } from '../../../common/resilience/encryption.service';
import { IdempotencyInterceptor } from '../../../common/resilience/idempotency.interceptor';
import { CostTrackerService } from '../cost/cost-tracker.service';
import { OutboxService } from '../outbox/outbox.service';
import { CacheManagerService } from '../caching/cache-manager.service';
import { PartitionManagerService } from '../partition/partition-manager.service';
import { QueueService } from '@easydev/shared-queues';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incrbyfloat: jest.fn().mockResolvedValue(1.5),
      incrby: jest.fn().mockResolvedValue(100),
      mget: jest.fn().mockResolvedValue([null, null, null]),
      on: jest.fn(),
      disconnect: jest.fn(),
      scan: jest.fn().mockResolvedValue(['0', []]),
    };
  });
});

// Mock Drizzle db
jest.mock('@easydev/database', () => {
  const original = jest.requireActual('@easydev/database');
  return {
    ...original,
    db: {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([{}]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    },
  };
});

describe('Production Hardening & Resilience Tests', () => {
  let encryptionService: EncryptionService;
  let costTracker: CostTrackerService;
  let outboxService: OutboxService;
  let cacheManager: CacheManagerService;
  let partitionManager: PartitionManagerService;
  let idempotencyInterceptor: IdempotencyInterceptor;

  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-outbox' }),
  };

  const tenantId = uuidv4();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        CostTrackerService,
        OutboxService,
        CacheManagerService,
        PartitionManagerService,
        IdempotencyInterceptor,
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    encryptionService = module.get<EncryptionService>(EncryptionService);
    costTracker = module.get<CostTrackerService>(CostTrackerService);
    outboxService = module.get<OutboxService>(OutboxService);
    cacheManager = module.get<CacheManagerService>(CacheManagerService);
    partitionManager = module.get<PartitionManagerService>(
      PartitionManagerService,
    );
    idempotencyInterceptor = module.get<IdempotencyInterceptor>(
      IdempotencyInterceptor,
    );
  });

  describe('Circuit Breaker (Resilience)', () => {
    it('should execute successfully in CLOSED state', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        cooldownPeriodMs: 1000,
      });

      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should trip to OPEN state after consecutive failures', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        cooldownPeriodMs: 1000,
      });

      const badCall = async () => {
        throw new Error('Failure');
      };

      await expect(breaker.execute(badCall)).rejects.toThrow('Failure');
      await expect(breaker.execute(badCall)).rejects.toThrow('Failure');

      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // Subsequent call should fast fail
      await expect(
        breaker.execute(async () => 'should not run'),
      ).rejects.toThrow('Circuit is OPEN for test-service');
    });

    it('should invoke fallback when breaker is tripped', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 1,
        cooldownPeriodMs: 1000,
      });

      const badCall = async () => {
        throw new Error('Failure');
      };

      // Trip the breaker
      await expect(breaker.execute(badCall)).rejects.toThrow();

      const result = await breaker.execute(
        async () => 'try-again',
        async (err) => 'fallback-value',
      );
      expect(result).toBe('fallback-value');
    });

    it('should enforce bulkhead concurrency limits', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 5,
        cooldownPeriodMs: 1000,
        concurrencyLimit: 1,
      });

      // Execute a long running task
      const longTask = () =>
        breaker.execute(
          () =>
            new Promise((resolve) => setTimeout(() => resolve('done'), 100)),
        );

      const promise1 = longTask();

      // Second task should immediately trip bulkhead limits
      await expect(longTask()).rejects.toThrow(
        'Bulkhead concurrency limit of 1 reached',
      );

      await promise1;
    });
  });

  describe('Encryption & Security Hardening', () => {
    it('should encrypt and decrypt values matching plaintext', () => {
      const plainText = 'my-secret-api-key-12345';
      const cipherText = encryptionService.encrypt(plainText);
      expect(cipherText).toContain(':');

      const decrypted = encryptionService.decrypt(cipherText);
      expect(decrypted).toBe(plainText);
    });

    it('should mask PII (email, phone, ip)', () => {
      expect(encryptionService.maskPII('kishore@gmail.com', 'email')).toBe(
        'k***e@gmail.com',
      );
      expect(encryptionService.maskPII('+919876543210', 'phone')).toBe(
        '+91***10',
      );
      expect(encryptionService.maskPII('192.168.1.100', 'ip')).toBe(
        '192.168.***.***',
      );
    });

    it('should redact sensitive keys in logs/data objects', () => {
      const payload = {
        name: 'User',
        password: 'superpassword',
        nested: {
          secretToken: 'secret-123',
        },
      };

      const redacted = encryptionService.redactSensitiveData(payload);
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.nested.secretToken).toBe('[REDACTED]');
      expect(redacted.name).toBe('User');
    });
  });

  describe('Idempotency Request Handling', () => {
    it('should skip interception if x-idempotency-key header is absent', async () => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {},
          }),
        }),
      } as any;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      const result = await idempotencyInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );
      expect(result).toBeDefined();
    });

    it('should enforce invalid format check on idempotency header keys', async () => {
      const mockExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            headers: {
              'x-idempotency-key': 'short',
            },
          }),
        }),
      } as any;

      const mockCallHandler: CallHandler = {
        handle: () => of({ success: true }),
      };

      await expect(
        idempotencyInterceptor.intercept(mockExecutionContext, mockCallHandler),
      ).rejects.toThrow('Invalid format for x-idempotency-key header');
    });
  });

  describe('Cost Optimization Tracker', () => {
    it('should track AI token counts and estimate costs', async () => {
      const cost = await costTracker.trackAiUsage(
        tenantId,
        'gpt-4',
        1000,
        2000,
      );
      // Cost: (1000/1000)*0.01 + (2000/1000)*0.03 = 0.01 + 0.06 = 0.07
      expect(cost).toBeCloseTo(0.07);
    });

    it('should track network and storage executions costs', async () => {
      const connCost = await costTracker.trackConnectorUsage(
        tenantId,
        'webhook',
        2048,
      );
      // Cost: (2048/1024)*0.0001 = 0.0002
      expect(connCost).toBeCloseTo(0.0002);

      const storageCost = await costTracker.trackStorageUsage(
        tenantId,
        1048576 * 10,
      ); // 10MB
      // Cost: 10 * 0.00002 = 0.0002
      expect(storageCost).toBeCloseTo(0.0002);
    });
  });

  describe('Transactional Outbox Pattern', () => {
    it('should insert outbox record transactionally', async () => {
      const id = await outboxService.storeEvent(tenantId, 'widget.installed', {
        domain: 'easydev.ai',
      });
      expect(id).toBeDefined();
    });
  });

  describe('Database Partition Management', () => {
    it('should manage and retrieve active partitioned lists', async () => {
      await partitionManager.createPartitionsForNextMonth();
      const metrics = await partitionManager.getPartitionMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].table).toBeDefined();
    });
  });

  describe('Cache Manager', () => {
    it('should format keys correctly isolating tenants', async () => {
      const cacheManagerAny = cacheManager as any;
      const key = cacheManagerAny.buildKey(tenantId, 'users', 'user-1');
      expect(key).toContain(tenantId);
      expect(key).toContain('users');
      expect(key).toContain('user-1');
    });
  });
});
