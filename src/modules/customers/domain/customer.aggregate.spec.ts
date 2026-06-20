import {
  CustomerEmail,
  CustomerPhone,
  CustomerStatus,
  CustomerStatusEnum,
  CustomerLanguage,
  CustomerTimezone,
} from './value-objects';
import { Customer } from './customer.aggregate';
import { CustomerProfile } from './customer-profile.entity';
import { CustomerMetrics } from './customer-metrics.entity';
import { randomUUID } from 'crypto';

describe('Customer DDD Domain Model', () => {
  const tenantId = randomUUID();

  describe('Value Objects', () => {
    it('should validate email format', () => {
      expect(() => CustomerEmail.create('invalid-email')).toThrow();
      expect(CustomerEmail.create('TEST@EXAMPLE.COM').value).toBe('test@example.com');
    });

    it('should validate phone format', () => {
      expect(() => CustomerPhone.create('abc')).toThrow();
      expect(CustomerPhone.create('+1-234-567-8900').value).toBe('+1-234-567-8900');
    });

    it('should validate preferred language length', () => {
      expect(() => CustomerLanguage.create('toolonglanguage')).toThrow();
      expect(CustomerLanguage.create('en-us').value).toBe('en-us');
    });

    it('should validate timezone length', () => {
      expect(() => CustomerTimezone.create('a'.repeat(60))).toThrow();
      expect(CustomerTimezone.create('America/New_York').value).toBe('America/New_York');
    });

    it('should validate status value', () => {
      expect(() => CustomerStatus.create('UNKNOWN' as any)).toThrow();
      expect(CustomerStatus.create(CustomerStatusEnum.ACTIVE).value).toBe(CustomerStatusEnum.ACTIVE);
    });
  });

  describe('Customer Aggregate Root', () => {
    const email = CustomerEmail.create('customer@easydev.com');
    const phone = CustomerPhone.create('+15550199');
    const status = CustomerStatus.create(CustomerStatusEnum.ACTIVE);
    const lang = CustomerLanguage.create('en');
    const tz = CustomerTimezone.create('UTC');

    it('should create a customer aggregate and append customer.created event', () => {
      const customerId = randomUUID();
      const customer = Customer.create(customerId, {
        tenantId,
        email,
        phone,
        status,
        preferredLanguage: lang,
        timezone: tz,
        source: 'API',
      });

      expect(customer.id).toBe(customerId);
      expect(customer.email.value).toBe('customer@easydev.com');
      expect(customer.domainEvents.length).toBe(1);
      expect((customer.domainEvents[0] as any).constructor.eventName).toBe('customer.created');
    });

    it('should update customer properties and append customer.updated event', () => {
      const customer = Customer.create(randomUUID(), {
        tenantId,
        email,
        status,
        preferredLanguage: lang,
        timezone: tz,
        source: 'API',
      });

      customer.clearEvents();
      customer.update({
        preferredLanguage: CustomerLanguage.create('fr'),
        timezone: CustomerTimezone.create('GMT'),
      });

      expect(customer.preferredLanguage.value).toBe('fr');
      expect(customer.timezone.value).toBe('GMT');
      expect(customer.version).toBe(2);
      expect((customer.domainEvents[0] as any).constructor.eventName).toBe('customer.updated');
    });

    it('should soft delete customer and append customer.deleted event', () => {
      const customer = Customer.create(randomUUID(), {
        tenantId,
        email,
        status,
        preferredLanguage: lang,
        timezone: tz,
        source: 'API',
      });

      customer.clearEvents();
      customer.delete();

      expect(customer.deletedAt).toBeDefined();
      expect(customer.status.value).toBe(CustomerStatusEnum.INACTIVE);
      expect((customer.domainEvents[0] as any).constructor.eventName).toBe('customer.deleted');
    });

    it('should restore customer and append customer.restored event', () => {
      const customer = Customer.create(randomUUID(), {
        tenantId,
        email,
        status,
        preferredLanguage: lang,
        timezone: tz,
        source: 'API',
      });

      customer.delete();
      customer.clearEvents();
      customer.restore();

      expect(customer.deletedAt).toBeUndefined();
      expect(customer.status.value).toBe(CustomerStatusEnum.ACTIVE);
      expect((customer.domainEvents[0] as any).constructor.eventName).toBe('customer.restored');
    });
  });

  describe('CustomerProfile Entity', () => {
    it('should allow profile creation and updates', () => {
      const customerId = randomUUID();
      const profile = new CustomerProfile(randomUUID(), {
        tenantId,
        customerId,
        firstName: 'John',
        lastName: 'Doe',
        tags: ['vip'],
      });

      expect(profile.firstName).toBe('John');
      expect(profile.tags).toContain('vip');

      profile.update({ firstName: 'Johnny', tags: ['vip', 'loyal'] });
      expect(profile.firstName).toBe('Johnny');
      expect(profile.tags).toContain('loyal');
    });
  });

  describe('CustomerMetrics Entity', () => {
    it('should allow metrics updates', () => {
      const customerId = randomUUID();
      const metrics = new CustomerMetrics(randomUUID(), {
        tenantId,
        customerId,
        totalConversations: 5,
        totalTickets: 2,
        totalOrders: 1,
        totalSpend: 150.5,
        averageCsat: 4.5,
        averageResponseTime: 120,
        averageResolutionTime: 600,
        sentimentScore: 0.8,
        lifetimeValue: 150.5,
        riskScore: 10,
        vipStatus: false,
      });

      expect(metrics.totalSpend).toBe(150.5);
      expect(metrics.vipStatus).toBe(false);

      metrics.update({ totalSpend: 1150.5, vipStatus: true, lifetimeValue: 1150.5 });
      expect(metrics.totalSpend).toBe(1150.5);
      expect(metrics.vipStatus).toBe(true);
    });
  });
});
