import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private customerRepo: Repository<Customer>) {}

  async findAll(tenantId: string) {
    return this.customerRepo.find({ where: { tenant_id: tenantId } });
  }

  async getCustomer360(tenantId: string, customerId: string) {
    // In production, this aggregates Orders, Tickets, Conversations, and LTV.
    const customer = await this.customerRepo.findOne({ where: { id: customerId, tenant_id: tenantId } });
    if (!customer) throw new Error('Customer not found');
    
    return {
      profile: customer,
      metrics: {
        ltv: customer.ltv,
        sentiment: customer.sentiment,
        riskScore: 'Low', // Calculated via AI
      },
      recentConversations: [], // Mock related query
      recentTickets: [],
    };
  }

  async create(tenantId: string, data: Partial<Customer>) {
    const customer = this.customerRepo.create({ ...data, tenant_id: tenantId });
    return this.customerRepo.save(customer);
  }
}
