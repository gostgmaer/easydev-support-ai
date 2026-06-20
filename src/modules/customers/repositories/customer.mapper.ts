import { Customer } from '../domain/customer.aggregate';
import { CustomerProfile } from '../domain/customer-profile.entity';
import { CustomerMetrics } from '../domain/customer-metrics.entity';
import {
  CustomerEmail,
  CustomerPhone,
  CustomerStatus,
  CustomerStatusEnum,
  CustomerLanguage,
  CustomerTimezone,
} from '../domain/value-objects';

export class CustomerMapper {
  public static toDomain(
    rawCustomer: any,
    rawProfile?: any,
    rawMetrics?: any
  ): Customer {
    const profile = rawProfile
      ? new CustomerProfile(rawProfile.id, {
          tenantId: rawProfile.tenantId,
          customerId: rawProfile.customerId,
          firstName: rawProfile.firstName || undefined,
          lastName: rawProfile.lastName || undefined,
          displayName: rawProfile.displayName || undefined,
          avatarUrl: rawProfile.avatarUrl || undefined,
          company: rawProfile.company || undefined,
          jobTitle: rawProfile.jobTitle || undefined,
          country: rawProfile.country || undefined,
          city: rawProfile.city || undefined,
          state: rawProfile.state || undefined,
          postalCode: rawProfile.postalCode || undefined,
          tags: (rawProfile.tags as string[]) || [],
          customAttributes: (rawProfile.customAttributes as Record<string, any>) || {},
          createdAt: rawProfile.createdAt,
          updatedAt: rawProfile.updatedAt,
        })
      : undefined;

    const metrics = rawMetrics
      ? new CustomerMetrics(rawMetrics.id, {
          tenantId: rawMetrics.tenantId,
          customerId: rawMetrics.customerId,
          totalConversations: rawMetrics.totalConversations ?? 0,
          totalTickets: rawMetrics.totalTickets ?? 0,
          totalOrders: rawMetrics.totalOrders ?? 0,
          totalSpend: Number(rawMetrics.totalSpend || 0),
          averageCsat: Number(rawMetrics.averageCsat || 0),
          averageResponseTime: rawMetrics.averageResponseTime ?? 0,
          averageResolutionTime: rawMetrics.averageResolutionTime ?? 0,
          sentimentScore: Number(rawMetrics.sentimentScore || 0),
          lifetimeValue: Number(rawMetrics.lifetimeValue || 0),
          riskScore: Number(rawMetrics.riskScore || 0),
          vipStatus: !!rawMetrics.vipStatus,
          createdAt: rawMetrics.createdAt,
          updatedAt: rawMetrics.updatedAt,
        })
      : undefined;

    return new Customer(rawCustomer.id, {
      tenantId: rawCustomer.tenantId,
      externalCustomerId: rawCustomer.externalCustomerId || undefined,
      email: CustomerEmail.create(rawCustomer.email),
      phone: rawCustomer.phone ? CustomerPhone.create(rawCustomer.phone) : undefined,
      status: CustomerStatus.create(rawCustomer.status as CustomerStatusEnum),
      preferredLanguage: CustomerLanguage.create(rawCustomer.preferredLanguage || 'en'),
      timezone: CustomerTimezone.create(rawCustomer.timezone || 'UTC'),
      lastSeenAt: rawCustomer.lastSeenAt || undefined,
      source: rawCustomer.source || 'API',
      metadata: (rawCustomer.metadata as Record<string, any>) || {},
      createdAt: rawCustomer.createdAt,
      updatedAt: rawCustomer.updatedAt,
      deletedAt: rawCustomer.deletedAt || undefined,
      version: rawCustomer.version || 1,
      profile,
      metrics,
    });
  }
}
