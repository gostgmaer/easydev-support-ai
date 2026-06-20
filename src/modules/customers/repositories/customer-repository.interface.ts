import { ITenantRepository } from '@easydev/shared-kernel';
import { Customer } from '../domain/customer.aggregate';

export interface CustomerQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  status?: string;
  email?: string;
  phone?: string;
  vipStatus?: boolean;
  search?: string;
  segmentId?: string;
}

export interface ICustomerRepository extends ITenantRepository<
  Customer,
  string
> {
  findByEmail(email: string, tenantId: string): Promise<Customer | null>;
  findByExternalId(
    externalId: string,
    tenantId: string,
  ): Promise<Customer | null>;
  restore(id: string, tenantId: string): Promise<boolean>;
  findPaginated(
    tenantId: string,
    options: CustomerQueryOptions,
  ): Promise<{ data: Customer[]; total: number; nextCursor?: string }>;
  search(tenantId: string, query: string, limit?: number): Promise<Customer[]>;
  assignSegment(
    customerId: string,
    segmentId: string,
    tenantId: string,
  ): Promise<void>;
  removeSegment(
    customerId: string,
    segmentId: string,
    tenantId: string,
  ): Promise<void>;
  findSegments(customerId: string, tenantId: string): Promise<string[]>;
  findSegmentMembers(segmentId: string, tenantId: string): Promise<Customer[]>;
}
