import { DrizzleCustomerRepository } from './drizzle-customer.repository';
import { DrizzleCustomerSegmentRepository } from './drizzle-customer-segment.repository';
import { db } from '@easydev/database';
import { Customer } from '../domain/customer.aggregate';
import {
  CustomerEmail,
  CustomerStatus,
  CustomerStatusEnum,
  CustomerLanguage,
  CustomerTimezone,
} from '../domain/value-objects';
import { randomUUID } from 'crypto';

jest.mock('@easydev/database', () => {
  const selectMock = jest.fn().mockReturnThis();
  const fromMock = jest.fn().mockReturnThis();
  const leftJoinMock = jest.fn().mockReturnThis();
  const innerJoinMock = jest.fn().mockReturnThis();
  const whereMock = jest.fn().mockReturnThis();
  const orderByMock = jest.fn().mockReturnThis();
  const limitMock = jest.fn().mockReturnThis();
  const offsetMock = jest.fn().mockReturnThis();
  const insertMock = jest.fn().mockReturnThis();
  const valuesMock = jest.fn().mockReturnThis();
  const updateMock = jest.fn().mockReturnThis();
  const setMock = jest.fn().mockReturnThis();
  const deleteMock = jest.fn().mockReturnThis();

  return {
    db: {
      select: selectMock,
      from: fromMock,
      leftJoin: leftJoinMock,
      innerJoin: innerJoinMock,
      where: whereMock,
      orderBy: orderByMock,
      limit: limitMock,
      offset: offsetMock,
      insert: insertMock,
      values: valuesMock,
      update: updateMock,
      set: setMock,
      delete: deleteMock,
      transaction: jest.fn((cb) =>
        cb({
          select: selectMock,
          from: fromMock,
          where: whereMock,
          insert: insertMock,
          values: valuesMock,
          update: updateMock,
          set: setMock,
        }),
      ),
    },
    schema: {
      customers: {
        id: 'customers.id',
        tenantId: 'customers.tenant_id',
        email: 'customers.email',
        deletedAt: 'customers.deleted_at',
      },
      customerProfiles: {
        customerId: 'customerProfiles.customer_id',
        tenantId: 'customerProfiles.tenant_id',
      },
      customerMetrics: {
        customerId: 'customerMetrics.customer_id',
        tenantId: 'customerMetrics.tenant_id',
      },
      customerSegments: {
        id: 'customerSegments.id',
        tenantId: 'customerSegments.tenant_id',
        segmentName: 'customerSegments.segment_name',
      },
      customerSegmentMembers: {
        customerId: 'customerSegmentMembers.customer_id',
        segmentId: 'customerSegmentMembers.segment_id',
        tenantId: 'customerSegmentMembers.tenant_id',
      },
    },
  };
});

describe('Drizzle Repositories', () => {
  let customerRepo: DrizzleCustomerRepository;
  let segmentRepo: DrizzleCustomerSegmentRepository;

  beforeEach(() => {
    customerRepo = new DrizzleCustomerRepository();
    segmentRepo = new DrizzleCustomerSegmentRepository();
    jest.clearAllMocks();
  });

  describe('DrizzleCustomerRepository', () => {
    const tenantId = randomUUID();
    const customerId = randomUUID();

    it('should findById and return mapped customer or null', async () => {
      const mockResult: any[] = [];
      const whereMock = (db.select() as any).where;
      whereMock.mockResolvedValue(mockResult);

      const res = await customerRepo.findById(customerId, tenantId);
      expect(res).toBeNull();
      expect(db.select).toHaveBeenCalled();
    });

    it('should findByEmail and query correct fields', async () => {
      const mockResult: any[] = [];
      const whereMock = (db.select() as any).where;
      whereMock.mockResolvedValue(mockResult);

      const res = await customerRepo.findByEmail('test@test.com', tenantId);
      expect(res).toBeNull();
    });

    it('should save customer aggregate in transaction', async () => {
      const customer = Customer.create(customerId, {
        tenantId,
        email: CustomerEmail.create('save@test.com'),
        status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
        preferredLanguage: CustomerLanguage.create('en'),
        timezone: CustomerTimezone.create('UTC'),
        source: 'API',
      });

      const selectMock = db.select as jest.Mock;
      const whereMock = (db.select() as any).where;
      whereMock.mockResolvedValue([]); // simulation customer doesn't exist

      const res = await customerRepo.save(customer, tenantId);
      expect(res).toBe(customer);
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('DrizzleCustomerSegmentRepository', () => {
    const tenantId = randomUUID();

    it('should findActive segments', async () => {
      const selectMock = db.select as jest.Mock;
      const whereMock = (db.select() as any).where;
      whereMock.mockResolvedValue([]);

      const res = await segmentRepo.findActive(tenantId);
      expect(res).toEqual([]);
    });
  });
});
