import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { ICustomerRepository } from '../repositories/customer-repository.interface';
import { Customer } from '../domain/customer.aggregate';
import { CustomerProfile } from '../domain/customer-profile.entity';
import { CustomerMetrics } from '../domain/customer-metrics.entity';
import {
  CustomerEmail,
  CustomerPhone,
  CustomerStatus,
  CustomerLanguage,
  CustomerTimezone,
  CustomerStatusEnum,
} from '../domain/value-objects';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CustomerQueryDto,
} from '../dtos';
import { CustomerEventPublisher } from './customer-event.publisher';
import { AuditService } from '../../audit/audit.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject('ICustomerRepository')
    private readonly customerRepo: ICustomerRepository,
    private readonly eventPublisher: CustomerEventPublisher,
    private readonly auditService: AuditService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateCustomerDto,
    userId?: string,
  ): Promise<Customer> {
    const existing = await this.customerRepo.findByEmail(dto.email, tenantId);
    if (existing) {
      throw new ConflictException(
        `Customer with email ${dto.email} already exists`,
      );
    }

    const customerId = randomUUID();
    let profile: CustomerProfile | undefined;
    if (dto.profile) {
      profile = new CustomerProfile(randomUUID(), {
        tenantId,
        customerId,
        firstName: dto.profile.firstName,
        lastName: dto.profile.lastName,
        displayName:
          dto.profile.displayName ||
          `${dto.profile.firstName || ''} ${dto.profile.lastName || ''}`.trim() ||
          dto.email,
        avatarUrl: dto.profile.avatarUrl,
        company: dto.profile.company,
        jobTitle: dto.profile.jobTitle,
        country: dto.profile.country,
        city: dto.profile.city,
        state: dto.profile.state,
        postalCode: dto.profile.postalCode,
        tags: dto.profile.tags || [],
        customAttributes: dto.profile.customAttributes || {},
      });
    }

    const customer = Customer.create(customerId, {
      tenantId,
      externalCustomerId: dto.externalCustomerId,
      email: CustomerEmail.create(dto.email),
      phone: dto.phone ? CustomerPhone.create(dto.phone) : undefined,
      status: CustomerStatus.create(CustomerStatusEnum.ACTIVE),
      preferredLanguage: CustomerLanguage.create(dto.preferredLanguage || 'en'),
      timezone: CustomerTimezone.create(dto.timezone || 'UTC'),
      source: dto.source || 'API',
      metadata: dto.metadata || {},
      profile,
    });

    const metrics = new CustomerMetrics(randomUUID(), {
      tenantId,
      customerId,
      totalConversations: 0,
      totalTickets: 0,
      totalOrders: 0,
      totalSpend: 0,
      averageCsat: 0,
      averageResponseTime: 0,
      averageResolutionTime: 0,
      sentimentScore: 0,
      lifetimeValue: 0,
      riskScore: 0,
      vipStatus: false,
    });
    customer.setMetrics(metrics);

    const saved = await this.customerRepo.save(customer, tenantId);
    await this.eventPublisher.publishAll(customer.domainEvents);
    customer.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_CREATE',
      details: `Created customer ${customer.id} (${customer.email.value})`,
    });

    return saved;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateCustomerDto,
    userId?: string,
  ): Promise<Customer> {
    const customer = await this.customerRepo.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const updateProps: any = {};
    if (dto.externalCustomerId !== undefined)
      updateProps.externalCustomerId = dto.externalCustomerId;
    if (dto.email !== undefined)
      updateProps.email = CustomerEmail.create(dto.email);
    if (dto.phone !== undefined)
      updateProps.phone = dto.phone
        ? CustomerPhone.create(dto.phone)
        : undefined;
    if (dto.status !== undefined)
      updateProps.status = CustomerStatus.create(
        dto.status as CustomerStatusEnum,
      );
    if (dto.preferredLanguage !== undefined)
      updateProps.preferredLanguage = CustomerLanguage.create(
        dto.preferredLanguage,
      );
    if (dto.timezone !== undefined)
      updateProps.timezone = CustomerTimezone.create(dto.timezone);
    if (dto.source !== undefined) updateProps.source = dto.source;
    if (dto.metadata !== undefined) updateProps.metadata = dto.metadata;

    customer.update(updateProps);

    if (dto.profile && customer.profile) {
      customer.profile.update(dto.profile);
    } else if (dto.profile) {
      const profile = new CustomerProfile(randomUUID(), {
        tenantId,
        customerId: customer.id,
        firstName: dto.profile.firstName,
        lastName: dto.profile.lastName,
        displayName: dto.profile.displayName,
        avatarUrl: dto.profile.avatarUrl,
        company: dto.profile.company,
        jobTitle: dto.profile.jobTitle,
        country: dto.profile.country,
        city: dto.profile.city,
        state: dto.profile.state,
        postalCode: dto.profile.postalCode,
        tags: dto.profile.tags || [],
        customAttributes: dto.profile.customAttributes || {},
      });
      customer.setProfile(profile);
    }

    const saved = await this.customerRepo.save(customer, tenantId);
    await this.eventPublisher.publishAll(customer.domainEvents);
    customer.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_UPDATE',
      details: `Updated customer ${customer.id}`,
    });

    return saved;
  }

  async delete(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const customer = await this.customerRepo.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    customer.delete();
    await this.customerRepo.save(customer, tenantId);
    await this.eventPublisher.publishAll(customer.domainEvents);
    customer.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_DELETE',
      details: `Soft deleted customer ${id}`,
    });

    return true;
  }

  async restore(
    tenantId: string,
    id: string,
    userId?: string,
  ): Promise<boolean> {
    const customer = await this.customerRepo.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    customer.restore();
    await this.customerRepo.save(customer, tenantId);
    await this.eventPublisher.publishAll(customer.domainEvents);
    customer.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_RESTORE',
      details: `Restored customer ${id}`,
    });

    return true;
  }

  async findById(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepo.findById(id, tenantId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return customer;
  }

  async findByEmail(tenantId: string, email: string): Promise<Customer | null> {
    return this.customerRepo.findByEmail(email, tenantId);
  }

  async findPaginated(tenantId: string, query: CustomerQueryDto) {
    return this.customerRepo.findPaginated(tenantId, query);
  }

  async merge(
    tenantId: string,
    sourceId: string,
    targetId: string,
    userId?: string,
  ): Promise<Customer> {
    const source = await this.customerRepo.findById(sourceId, tenantId);
    const target = await this.customerRepo.findById(targetId, tenantId);

    if (!source || !target) {
      throw new NotFoundException('Source or Target customer not found');
    }

    if (source.metrics && target.metrics) {
      const mergedMetrics = new CustomerMetrics(target.metrics.id, {
        tenantId,
        customerId: target.id,
        totalConversations:
          target.metrics.totalConversations + source.metrics.totalConversations,
        totalTickets: target.metrics.totalTickets + source.metrics.totalTickets,
        totalOrders: target.metrics.totalOrders + source.metrics.totalOrders,
        totalSpend: target.metrics.totalSpend + source.metrics.totalSpend,
        averageCsat:
          (target.metrics.averageCsat + source.metrics.averageCsat) / 2,
        averageResponseTime: Math.round(
          (target.metrics.averageResponseTime +
            source.metrics.averageResponseTime) /
            2,
        ),
        averageResolutionTime: Math.round(
          (target.metrics.averageResolutionTime +
            source.metrics.averageResolutionTime) /
            2,
        ),
        sentimentScore:
          (target.metrics.sentimentScore + source.metrics.sentimentScore) / 2,
        lifetimeValue:
          target.metrics.lifetimeValue + source.metrics.lifetimeValue,
        riskScore: Math.max(target.metrics.riskScore, source.metrics.riskScore),
        vipStatus: target.metrics.vipStatus || source.metrics.vipStatus,
      });
      target.updateMetrics(mergedMetrics);
    }

    source.delete();
    source.update({ status: CustomerStatus.create(CustomerStatusEnum.MERGED) });

    await this.customerRepo.save(target, tenantId);
    await this.customerRepo.save(source, tenantId);

    await this.eventPublisher.publishAll(target.domainEvents);
    await this.eventPublisher.publishAll(source.domainEvents);
    target.clearEvents();
    source.clearEvents();

    await this.auditService.log({
      tenantId,
      userId,
      action: 'CUSTOMER_MERGE',
      details: `Merged customer ${sourceId} into ${targetId}`,
    });

    return target;
  }

  async export(tenantId: string, format: 'CSV' | 'JSON'): Promise<string> {
    const customers = await this.customerRepo.findAll(tenantId);
    const data = customers.map((c) => c.toJSON());

    if (format === 'JSON') {
      return JSON.stringify(data, null, 2);
    }

    const headers = [
      'id',
      'email',
      'phone',
      'status',
      'preferredLanguage',
      'timezone',
      'source',
      'createdAt',
    ];
    const csvRows = [headers.join(',')];

    for (const item of data) {
      const values = [
        item.id,
        item.email,
        item.phone || '',
        item.status,
        item.preferredLanguage,
        item.timezone,
        item.source,
        item.createdAt instanceof Date
          ? item.createdAt.toISOString()
          : new Date(item.createdAt).toISOString(),
      ];
      csvRows.push(
        values.map((val) => `"${val.replace(/"/g, '""')}"`).join(','),
      );
    }

    return csvRows.join('\n');
  }

  async import(
    tenantId: string,
    records: any[],
    userId?: string,
  ): Promise<{ importedCount: number; errors: string[] }> {
    let importedCount = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        if (!record.email) {
          errors.push('Record missing email field');
          continue;
        }

        const dto: CreateCustomerDto = {
          email: record.email,
          phone: record.phone,
          externalCustomerId: record.externalCustomerId,
          preferredLanguage: record.preferredLanguage,
          timezone: record.timezone,
          source: record.source || 'IMPORT',
          metadata: record.metadata,
          profile: record.profile || {
            firstName: record.firstName,
            lastName: record.lastName,
            displayName:
              record.displayName ||
              `${record.firstName || ''} ${record.lastName || ''}`.trim() ||
              undefined,
          },
        };

        await this.create(tenantId, dto, userId);
        importedCount++;
      } catch (err: any) {
        errors.push(
          `Failed to import record ${record.email || 'unknown'}: ${err.message}`,
        );
      }
    }

    return { importedCount, errors };
  }
}
