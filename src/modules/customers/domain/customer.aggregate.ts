import { AggregateRoot } from '@easydev/shared-kernel';
import {
  CustomerEmail,
  CustomerPhone,
  CustomerStatus,
  CustomerStatusEnum,
  CustomerLanguage,
  CustomerTimezone,
} from './value-objects';
import { CustomerProfile } from './customer-profile.entity';
import { CustomerMetrics } from './customer-metrics.entity';
import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  CustomerDeletedEvent,
  CustomerRestoredEvent,
  CustomerSegmentAssignedEvent,
  CustomerMetricsUpdatedEvent,
} from '@easydev/shared-events';

export interface CustomerProps {
  tenantId: string;
  externalCustomerId?: string;
  email: CustomerEmail;
  phone?: CustomerPhone;
  status: CustomerStatus;
  preferredLanguage: CustomerLanguage;
  timezone: CustomerTimezone;
  lastSeenAt?: Date;
  source: string; // WIDGET, API, IMPORT, MANUAL
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  profile?: CustomerProfile;
  metrics?: CustomerMetrics;
}

export class Customer extends AggregateRoot<string> {
  private props: CustomerProps;

  constructor(id: string, props: CustomerProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get externalCustomerId(): string | undefined { return this.props.externalCustomerId; }
  get email(): CustomerEmail { return this.props.email; }
  get phone(): CustomerPhone | undefined { return this.props.phone; }
  get status(): CustomerStatus { return this.props.status; }
  get preferredLanguage(): CustomerLanguage { return this.props.preferredLanguage; }
  get timezone(): CustomerTimezone { return this.props.timezone; }
  get lastSeenAt(): Date | undefined { return this.props.lastSeenAt; }
  get source(): string { return this.props.source; }
  get metadata(): Record<string, any> | undefined { return this.props.metadata; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get deletedAt(): Date | undefined { return this.props.deletedAt; }
  get version(): number { return this.props.version!; }

  get profile(): CustomerProfile | undefined { return this.props.profile; }
  get metrics(): CustomerMetrics | undefined { return this.props.metrics; }

  public setProfile(profile: CustomerProfile): void {
    this.props.profile = profile;
    this.props.updatedAt = new Date();
  }

  public setMetrics(metrics: CustomerMetrics): void {
    this.props.metrics = metrics;
    this.props.updatedAt = new Date();
  }

  public static create(id: string, props: Omit<CustomerProps, 'createdAt' | 'updatedAt' | 'version'>): Customer {
    const customer = new Customer(id, props);
    customer.addDomainEvent(
      new CustomerCreatedEvent(
        customer.tenantId,
        customer.id,
        customer.profile?.displayName || customer.email.value,
        customer.email.value
      )
    );
    return customer;
  }

  public update(props: Partial<Pick<CustomerProps, 'externalCustomerId' | 'email' | 'phone' | 'status' | 'preferredLanguage' | 'timezone' | 'lastSeenAt' | 'source' | 'metadata'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
      version: this.props.version! + 1,
    };
    this.addDomainEvent(
      new CustomerUpdatedEvent(
        this.tenantId,
        this.id,
        this.profile?.displayName || this.email.value,
        this.email.value
      )
    );
  }

  public delete(): void {
    this.props.deletedAt = new Date();
    this.props.status = CustomerStatus.create(CustomerStatusEnum.INACTIVE);
    this.props.updatedAt = new Date();
    this.props.version = this.props.version! + 1;
    this.addDomainEvent(new CustomerDeletedEvent(this.tenantId, this.id));
  }

  public restore(): void {
    this.props.deletedAt = undefined;
    this.props.status = CustomerStatus.create(CustomerStatusEnum.ACTIVE);
    this.props.updatedAt = new Date();
    this.props.version = this.props.version! + 1;
    this.addDomainEvent(new CustomerRestoredEvent(this.tenantId, this.id));
  }

  public assignSegment(segmentId: string): void {
    this.addDomainEvent(new CustomerSegmentAssignedEvent(this.tenantId, this.id, segmentId));
  }

  public updateMetrics(metrics: CustomerMetrics): void {
    this.setMetrics(metrics);
    this.addDomainEvent(new CustomerMetricsUpdatedEvent(this.tenantId, this.id, metrics.toJSON()));
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      externalCustomerId: this.externalCustomerId,
      email: this.email.value,
      phone: this.phone?.value,
      status: this.status.value,
      preferredLanguage: this.preferredLanguage.value,
      timezone: this.timezone.value,
      lastSeenAt: this.lastSeenAt,
      source: this.source,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      profile: this.profile?.toJSON(),
      metrics: this.metrics?.toJSON(),
    };
  }
}
