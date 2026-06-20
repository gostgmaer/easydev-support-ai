import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private customerRepo: Repository<Customer>) {}

  async findAll(tenantId: string) {
    return this.customerRepo.find({ where: { tenantId } });
  }

  async getCustomer360(tenantId: string, customerId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenantId } });
    if (!customer) throw new Error('Customer not found');
    
    return {
      profile: customer,
      metrics: {
        ltv: (customer.metadata?.ltv as number) || 0,
        sentiment: (customer.metadata?.sentiment as string) || 'NEUTRAL',
        riskScore: 'Low', // Calculated via AI
      },
      recentConversations: [],
      recentTickets: [],
    };
  }

  async create(tenantId: string, data: Partial<Customer>) {
    const customer = this.customerRepo.create({ ...data, tenantId });
    return this.customerRepo.save(customer);
  }
}
