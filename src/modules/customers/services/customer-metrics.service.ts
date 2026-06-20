import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerRepository } from '../repositories/customer-repository.interface';
import { CustomerMetrics } from '../domain/customer-metrics.entity';
import { CustomerMetricsDto } from '../dtos/customer-metrics.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomerMetricsService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepo: ICustomerRepository
  ) {}

  async updateMetrics(
    tenantId: string,
    customerId: string,
    dto: CustomerMetricsDto
  ): Promise<CustomerMetrics> {
    const customer = await this.customerRepo.findById(customerId, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    let metrics = customer.metrics;
    if (metrics) {
      metrics.update(dto as any);
    } else {
      metrics = new CustomerMetrics(randomUUID(), {
        tenantId,
        customerId,
        totalConversations: dto.totalConversations ?? 0,
        totalTickets: dto.totalTickets ?? 0,
        totalOrders: dto.totalOrders ?? 0,
        totalSpend: dto.totalSpend ?? 0,
        averageCsat: dto.averageCsat ?? 0,
        averageResponseTime: dto.averageResponseTime ?? 0,
        averageResolutionTime: dto.averageResolutionTime ?? 0,
        sentimentScore: dto.sentimentScore ?? 0,
        lifetimeValue: dto.lifetimeValue ?? dto.totalSpend ?? 0,
        riskScore: dto.riskScore ?? 0,
        vipStatus: dto.vipStatus ?? false,
      });
      customer.setMetrics(metrics);
    }

    customer.updateMetrics(metrics);
    await this.customerRepo.save(customer, tenantId);
    return metrics;
  }

  async recalculateMetrics(tenantId: string, customerId: string): Promise<CustomerMetrics> {
    const customer = await this.customerRepo.findById(customerId, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    // In a real scenario, this would query tickets/conversations to aggregate counts
    // We will increment total conversations and recalculate sentiment
    let metrics = customer.metrics;
    const currentConversations = metrics?.totalConversations || 0;
    const recalculatedDto: CustomerMetricsDto = {
      totalConversations: currentConversations + 1,
      totalSpend: (metrics?.totalSpend || 0) + 100, // standard increment
      lifetimeValue: (metrics?.lifetimeValue || 0) + 100,
      sentimentScore: Math.min(1, Math.max(-1, (metrics?.sentimentScore || 0) + 0.1)),
      vipStatus: (metrics?.lifetimeValue || 0) + 100 > 1000,
    };

    return this.updateMetrics(tenantId, customerId, recalculatedDto);
  }
}
