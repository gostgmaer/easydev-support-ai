import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerRepository } from '../repositories/customer-repository.interface';
import { CustomerProfile } from '../domain/customer-profile.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomerProfileService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async updateProfile(
    tenantId: string,
    customerId: string,
    data: any,
  ): Promise<CustomerProfile> {
    const customer = await this.customerRepo.findById(customerId, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (customer.profile) {
      customer.profile.update(data);
    } else {
      const profile = new CustomerProfile(randomUUID(), {
        tenantId,
        customerId,
        ...data,
      });
      customer.setProfile(profile);
    }

    await this.customerRepo.save(customer, tenantId);
    return customer.profile!;
  }
}
