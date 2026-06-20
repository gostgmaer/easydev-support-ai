import { Injectable, Inject } from '@nestjs/common';
import type { ICustomerRepository } from '../repositories/customer-repository.interface';
import { Customer } from '../domain/customer.aggregate';

@Injectable()
export class CustomerSearchService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepo: ICustomerRepository
  ) {}

  async search(tenantId: string, query: string, limit = 20): Promise<Customer[]> {
    if (!query || !query.trim()) {
      return [];
    }
    return this.customerRepo.search(tenantId, query.trim(), limit);
  }
}
