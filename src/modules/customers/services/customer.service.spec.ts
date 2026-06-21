import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from './customer.service';
import { CustomerEventPublisher } from './customer-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import { Customer } from '../domain/customer.aggregate';
import {
  CustomerEmail,
  CustomerStatus,
  CustomerStatusEnum,
  CustomerLanguage,
  CustomerTimezone,
} from '../domain/value-objects';
import { CreateCustomerDto, UpdateCustomerDto } from '../dtos';
import { randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CustomerService', () => {
  let service: CustomerService;
  let repo: any;
  let publisher: any;
  let audit: any;

  const mockCustomerRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByExternalId: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn((c) => Promise.resolve(c)),
    delete: jest.fn(),
    restore: jest.fn(),
    findPaginated: jest.fn(),
    search: jest.fn(),
    assignSegment: jest.fn(),
    removeSegment: jest.fn(),
    findSegments: jest.fn(),
    findSegmentMembers: jest.fn(),
  };

  const mockEventPublisher = {
    publish: jest.fn(),
    publishAll: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockWorkflowEngineService = {
    evaluateEventTriggers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: 'ICustomerRepository', useValue: mockCustomerRepo },
        { provide: CustomerEventPublisher, useValue: mockEventPublisher },
        { provide: AuditService, useValue: mockAuditService },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngineService },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    repo = module.get('ICustomerRepository');
    publisher = module.get(CustomerEventPublisher);
    audit = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = randomUUID();
    const dto: CreateCustomerDto = {
      email: 'john@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should create a customer when email does not exist', async () => {
      repo.findByEmail.mockResolvedValue(null);

      const result = await service.create(tenantId, dto);

      expect(result).toBeDefined();
      expect(result.email.value).toBe('john@example.com');
      expect(repo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_CREATE',
        }),
      );
    });

    it('should throw ConflictException when email exists', async () => {
      repo.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(service.create(tenantId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const tenantId = randomUUID();
    const customerId = randomUUID();

    it('should update customer and profile', async () => {
      const customer = Customer.create(customerId, {
        tenantId,
        email: CustomerEmail.create('old@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });
      repo.findById.mockResolvedValue(customer);

      const dto: UpdateCustomerDto = {
        email: 'new@example.com',
        profile: {
          firstName: 'NewName',
        },
      };

      const result = await service.update(tenantId, customerId, dto);

      expect(result.email.value).toBe('new@example.com');
      expect(result.profile?.firstName).toBe('NewName');
      expect(repo.save).toHaveBeenCalled();
      expect(publisher.publishAll).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_UPDATE',
        }),
      );
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(tenantId, customerId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete & restore', () => {
    const tenantId = randomUUID();
    const customerId = randomUUID();

    it('should soft delete customer', async () => {
      const customer = Customer.create(customerId, {
        tenantId,
        email: CustomerEmail.create('del@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });
      repo.findById.mockResolvedValue(customer);

      const deleted = await service.delete(tenantId, customerId);

      expect(deleted).toBe(true);
      expect(customer.status.value).toBe(CustomerStatusEnum.INACTIVE);
      expect(customer.deletedAt).toBeDefined();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should restore deleted customer', async () => {
      const customer = Customer.create(customerId, {
        tenantId,
        email: CustomerEmail.create('res@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.INACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });
      customer.delete();
      repo.findById.mockResolvedValue(customer);

      const restored = await service.restore(tenantId, customerId);

      expect(restored).toBe(true);
      expect(customer.status.value).toBe(CustomerStatusEnum.ACTIVE);
      expect(customer.deletedAt).toBeUndefined();
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    const tenantId = randomUUID();
    const sourceId = randomUUID();
    const targetId = randomUUID();

    it('should merge source customer into target customer', async () => {
      const source = Customer.create(sourceId, {
        tenantId,
        email: CustomerEmail.create('source@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });
      const target = Customer.create(targetId, {
        tenantId,
        email: CustomerEmail.create('target@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });

      repo.findById.mockImplementation((id: string) => {
        if (id === sourceId) return Promise.resolve(source);
        if (id === targetId) return Promise.resolve(target);
        return Promise.resolve(null);
      });

      const merged = await service.merge(tenantId, sourceId, targetId);

      expect(merged.id).toBe(targetId);
      expect(source.status.value).toBe(CustomerStatusEnum.MERGED);
      expect(source.deletedAt).toBeDefined();
      expect(repo.save).toHaveBeenCalledTimes(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_MERGE',
        }),
      );
    });
  });

  describe('export & import', () => {
    const tenantId = randomUUID();

    it('should export all customers in JSON and CSV format', async () => {
      const customer = Customer.create(randomUUID(), {
        tenantId,
        email: CustomerEmail.create('export@example.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });
      repo.findAll.mockResolvedValue([customer]);

      const jsonStr = await service.export(tenantId, 'JSON');
      expect(jsonStr).toContain('export@example.com');

      const csvStr = await service.export(tenantId, 'CSV');
      expect(csvStr).toContain('export@example.com');
      expect(csvStr).toContain('status');
    });

    it('should import records', async () => {
      repo.findByEmail.mockResolvedValue(null);
      const records = [
        { email: 'import1@example.com', firstName: 'John' },
        { email: 'import2@example.com', firstName: 'Jane' },
      ];

      const res = await service.import(tenantId, records);

      expect(res.importedCount).toBe(2);
      expect(res.errors.length).toBe(0);
    });
  });
});
