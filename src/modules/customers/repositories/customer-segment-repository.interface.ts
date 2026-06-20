import { ITenantRepository } from '@easydev/shared-kernel';
import { CustomerSegment } from '../domain/customer-segment.entity';

export interface ICustomerSegmentRepository extends ITenantRepository<CustomerSegment, string> {
  findByName(name: string, tenantId: string): Promise<CustomerSegment | null>;
  findActive(tenantId: string): Promise<CustomerSegment[]>;
}
