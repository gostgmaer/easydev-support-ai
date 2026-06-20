import { Test, TestingModule } from '@nestjs/testing';
import { CustomerController } from './customer.controller';
import { CustomerService } from '../services/customer.service';
import { CustomerProfileService } from '../services/customer-profile.service';
import { CustomerTimelineService } from '../services/customer-timeline.service';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { CreateCustomerDto, UpdateCustomerDto } from '../dtos';
import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { TenantResolver } from '@easydev/shared-kernel';

describe('CustomerController', () => {
  let controller: CustomerController;
  let customerService: any;
  let profileService: any;
  let timelineService: any;

  const mockCustomerService = {
    create: jest.fn(),
    findPaginated: jest.fn(),
    export: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    restore: jest.fn(),
    merge: jest.fn(),
    import: jest.fn(),
  };

  const mockProfileService = {
    updateProfile: jest.fn(),
  };

  const mockTimelineService = {
    getTimeline: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [
        TenantResolver,
        { provide: CustomerService, useValue: mockCustomerService },
        { provide: CustomerProfileService, useValue: mockProfileService },
        { provide: CustomerTimelineService, useValue: mockTimelineService },
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get<CustomerService>(CustomerService);
    profileService = module.get<CustomerProfileService>(CustomerProfileService);
    timelineService = module.get<CustomerTimelineService>(
      CustomerTimelineService,
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should invoke CustomerService.create and return JSON', async () => {
      const tenantId = randomUUID();
      const dto: CreateCustomerDto = { email: 'test@easydev.com' };
      const mockResult = {
        toJSON: () => ({ id: 'c1', email: 'test@easydev.com' }),
      };
      mockCustomerService.create.mockResolvedValue(mockResult);

      const res = await controller.create(tenantId, dto, {
        user: { id: 'u1' },
      });

      expect(res).toEqual({ id: 'c1', email: 'test@easydev.com' });
      expect(customerService.create).toHaveBeenCalledWith(tenantId, dto, 'u1');
    });
  });

  describe('findPaginated', () => {
    it('should invoke CustomerService.findPaginated and return rows', async () => {
      const tenantId = randomUUID();
      const query = { page: 1, limit: 10 };
      const mockResult = {
        data: [{ toJSON: () => ({ id: 'c1' }) }],
        total: 1,
        nextCursor: undefined,
      };
      mockCustomerService.findPaginated.mockResolvedValue(mockResult);

      const res = await controller.findPaginated(tenantId, query);

      expect(res.data).toEqual([{ id: 'c1' }]);
      expect(res.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update customer properties', async () => {
      const tenantId = randomUUID();
      const dto: UpdateCustomerDto = { email: 'new@easydev.com' };
      const mockResult = {
        toJSON: () => ({ id: 'c1', email: 'new@easydev.com' }),
      };
      mockCustomerService.update.mockResolvedValue(mockResult);

      const res = await controller.update(tenantId, 'c1', dto, {
        user: { id: 'u1' },
      });

      expect(res).toEqual({ id: 'c1', email: 'new@easydev.com' });
      expect(customerService.update).toHaveBeenCalledWith(
        tenantId,
        'c1',
        dto,
        'u1',
      );
    });
  });

  describe('delete & restore', () => {
    it('should delete a customer', async () => {
      const tenantId = randomUUID();
      await controller.delete(tenantId, 'c1', { user: { id: 'u1' } });
      expect(customerService.delete).toHaveBeenCalledWith(tenantId, 'c1', 'u1');
    });

    it('should restore a customer', async () => {
      const tenantId = randomUUID();
      const res = await controller.restore(tenantId, 'c1', {
        user: { id: 'u1' },
      });
      expect(res).toEqual({ success: true });
      expect(customerService.restore).toHaveBeenCalledWith(
        tenantId,
        'c1',
        'u1',
      );
    });
  });

  describe('merge', () => {
    it('should call merge service', async () => {
      const tenantId = randomUUID();
      const mockResult = { toJSON: () => ({ id: 'target' }) };
      mockCustomerService.merge.mockResolvedValue(mockResult);

      const res = await controller.merge(tenantId, 'source', 'target', {
        user: { id: 'u1' },
      });

      expect(res).toEqual({ id: 'target' });
      expect(customerService.merge).toHaveBeenCalledWith(
        tenantId,
        'source',
        'target',
        'u1',
      );
    });
  });
});
