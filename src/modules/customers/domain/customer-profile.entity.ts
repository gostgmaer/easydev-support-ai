import { Entity } from '@easydev/shared-kernel';

export interface CustomerProfileProps {
  tenantId: string;
  customerId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags?: string[];
  customAttributes?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerProfile extends Entity<string> {
  private props: CustomerProfileProps;

  constructor(id: string, props: CustomerProfileProps) {
    super(id);
    this.props = {
      ...props,
      tags: props.tags || [],
      customAttributes: props.customAttributes || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get customerId(): string { return this.props.customerId; }
  get firstName(): string | undefined { return this.props.firstName; }
  get lastName(): string | undefined { return this.props.lastName; }
  get displayName(): string | undefined { return this.props.displayName; }
  get avatarUrl(): string | undefined { return this.props.avatarUrl; }
  get company(): string | undefined { return this.props.company; }
  get jobTitle(): string | undefined { return this.props.jobTitle; }
  get country(): string | undefined { return this.props.country; }
  get city(): string | undefined { return this.props.city; }
  get state(): string | undefined { return this.props.state; }
  get postalCode(): string | undefined { return this.props.postalCode; }
  get tags(): string[] { return this.props.tags || []; }
  get customAttributes(): Record<string, any> { return this.props.customAttributes || {}; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }

  public update(props: Partial<Omit<CustomerProfileProps, 'tenantId' | 'customerId' | 'createdAt'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      customerId: this.customerId,
      firstName: this.firstName,
      lastName: this.lastName,
      displayName: this.displayName,
      avatarUrl: this.avatarUrl,
      company: this.company,
      jobTitle: this.jobTitle,
      country: this.country,
      city: this.city,
      state: this.state,
      postalCode: this.postalCode,
      tags: this.tags,
      customAttributes: this.customAttributes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
