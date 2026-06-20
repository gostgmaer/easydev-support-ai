import { Entity } from '@easydev/shared-kernel';

export interface TenantOverrideProps {
  tenantId: string;
  featureKey: string;
  overrideValue: any;
  reason: string;
  expiresAt?: Date;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class TenantOverride extends Entity<string> {
  private props: TenantOverrideProps;

  constructor(id: string, props: TenantOverrideProps) {
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
  get overrideValue(): any {
    return this.props.overrideValue;
  }
  get reason(): string {
    return this.props.reason;
  }
  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }
  get createdBy(): string | undefined {
    return this.props.createdBy;
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
      overrideValue: any;
      reason: string;
      expiresAt?: Date;
      createdBy?: string;
    },
  ): TenantOverride {
    return new TenantOverride(id, props);
  }

  public isExpired(at: Date = new Date()): boolean {
    return !!this.props.expiresAt && this.props.expiresAt.getTime() <= at.getTime();
  }

  public update(overrideValue: any, reason: string, expiresAt?: Date): void {
    this.props.overrideValue = overrideValue;
    this.props.reason = reason;
    this.props.expiresAt = expiresAt;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      featureKey: this.featureKey,
      overrideValue: this.overrideValue,
      reason: this.reason,
      expiresAt: this.expiresAt,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
