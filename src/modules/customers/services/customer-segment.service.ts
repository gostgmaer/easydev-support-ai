import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ICustomerSegmentRepository } from '../repositories/customer-segment-repository.interface';
import type { ICustomerRepository } from '../repositories/customer-repository.interface';
import { CustomerSegment } from '../domain/customer-segment.entity';
import { Customer } from '../domain/customer.aggregate';
import { CustomerSegmentDto } from '../dtos/customer-segment.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomerSegmentService {
  constructor(
    @Inject('ICustomerSegmentRepository')
    private readonly segmentRepo: ICustomerSegmentRepository,
    @Inject('ICustomerRepository')
    private readonly customerRepo: ICustomerRepository
  ) {}

  async createSegment(tenantId: string, dto: CustomerSegmentDto): Promise<CustomerSegment> {
    const segment = new CustomerSegment(randomUUID(), {
      tenantId,
      segmentName: dto.segmentName,
      segmentType: dto.segmentType,
      rules: dto.rules,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });

    return this.segmentRepo.save(segment, tenantId);
  }

  async updateSegment(tenantId: string, segmentId: string, dto: CustomerSegmentDto): Promise<CustomerSegment> {
    const segment = await this.segmentRepo.findById(segmentId, tenantId);
    if (!segment) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found`);
    }

    segment.update({
      segmentName: dto.segmentName,
      segmentType: dto.segmentType,
      rules: dto.rules,
      description: dto.description,
      isActive: dto.isActive,
    });

    return this.segmentRepo.save(segment, tenantId);
  }

  async deleteSegment(tenantId: string, segmentId: string): Promise<boolean> {
    return this.segmentRepo.delete(segmentId, tenantId);
  }

  async assignCustomerToSegment(tenantId: string, customerId: string, segmentId: string): Promise<void> {
    const customer = await this.customerRepo.findById(customerId, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const segment = await this.segmentRepo.findById(segmentId, tenantId);
    if (!segment) {
      throw new NotFoundException(`Segment with ID ${segmentId} not found`);
    }

    customer.assignSegment(segmentId);
    await this.customerRepo.assignSegment(customerId, segmentId, tenantId);
    await this.customerRepo.save(customer, tenantId); // Save aggregates to publish events
  }

  async removeCustomerFromSegment(tenantId: string, customerId: string, segmentId: string): Promise<void> {
    await this.customerRepo.removeSegment(customerId, segmentId, tenantId);
  }

  async findSegmentsForCustomer(tenantId: string, customerId: string): Promise<string[]> {
    return this.customerRepo.findSegments(customerId, tenantId);
  }

  async findSegmentMembers(tenantId: string, segmentId: string): Promise<Customer[]> {
    return this.customerRepo.findSegmentMembers(segmentId, tenantId);
  }

  async runDynamicSegmentation(tenantId: string, segmentId: string): Promise<void> {
    const segment = await this.segmentRepo.findById(segmentId, tenantId);
    if (!segment || segment.segmentType !== 'DYNAMIC') return;

    // Evaluates dynamic rules (e.g. spend > X or CSAT < Y)
    // For simplicity, we query all customers and match rules.
    const allCustomers = await this.customerRepo.findAll(tenantId);
    const rules = segment.rules || {};

    for (const customer of allCustomers) {
      let matches = true;

      // Spend rule
      if (rules.spend?.gt && customer.metrics) {
        if (customer.metrics.totalSpend <= rules.spend.gt) {
          matches = false;
        }
      }

      // CSAT rule
      if (rules.csat?.lt && customer.metrics) {
        if (customer.metrics.averageCsat >= rules.csat.lt) {
          matches = false;
        }
      }

      if (matches) {
        await this.customerRepo.assignSegment(customer.id, segment.id, tenantId);
      } else {
        await this.customerRepo.removeSegment(customer.id, segment.id, tenantId);
      }
    }
  }

  async findAllSegments(tenantId: string): Promise<CustomerSegment[]> {
    return this.segmentRepo.findAll(tenantId);
  }
}
