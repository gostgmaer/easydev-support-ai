import { Entity } from '@easydev/shared-kernel';

export interface FeatureAccessProps {
  tenantId: string;
  featureKey: string;
  isEnabled: boolean;
  plan?: string;
  grantedBy?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class FeatureAccess extends Entity<string> {
  private props: FeatureAccessProps;

  constructor(id: string, props: FeatureAccessProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get featureKey(): string {
    return this.props.featureKey;
  }
  get isEnabled(): boolean {
    return this.props.isEnabled;
  }
  get plan(): string | undefined {
    return this.props.plan;
  }
  get grantedBy(): string | undefined {
    return this.props.grantedBy;
  }
  get notes(): string | undefined {
    return this.props.notes;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: {
      tenantId: string;
      featureKey: string;
      isEnabled?: boolean;
      plan?: string;
      grantedBy?: string;
      notes?: string;
    },
  ): FeatureAccess {
    return new FeatureAccess(id, {
      ...props,
      isEnabled: props.isEnabled ?? true,
    });
  }

  public grant(grantedBy?: string, notes?: string): void {
    this.props.isEnabled = true;
    this.props.grantedBy = grantedBy;
    if (notes !== undefined) this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  public revoke(notes?: string): void {
    this.props.isEnabled = false;
    if (notes !== undefined) this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      featureKey: this.featureKey,
      isEnabled: this.isEnabled,
      plan: this.plan,
      grantedBy: this.grantedBy,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
