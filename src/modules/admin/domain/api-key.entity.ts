import { Entity } from '@easydev/shared-kernel';
import { ApiKeyStatus, ApiKeyStatusEnum } from './value-objects';

export interface ApiKeyProps {
  tenantId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt?: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  usageCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  version?: number;
}

export class ApiKey extends Entity<string> {
  private props: ApiKeyProps;

  constructor(id: string, props: ApiKeyProps) {
    super(id);
    this.props = {
      ...props,
      usageCount: props.usageCount ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get keyHash(): string {
    return this.props.keyHash;
  }
  get keyPrefix(): string {
    return this.props.keyPrefix;
  }
  get scopes(): string[] {
    return this.props.scopes;
  }
  get status(): ApiKeyStatus {
    return this.props.status;
  }
  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }
  get lastUsedAt(): Date | undefined {
    return this.props.lastUsedAt;
  }
  get revokedAt(): Date | undefined {
    return this.props.revokedAt;
  }
  get usageCount(): number {
    return this.props.usageCount ?? 0;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get createdBy(): string | undefined {
    return this.props.createdBy;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: {
      tenantId: string;
      name: string;
      keyHash: string;
      keyPrefix: string;
      scopes: string[];
      expiresAt?: Date;
      createdBy?: string;
    },
  ): ApiKey {
    return new ApiKey(id, {
      ...props,
      status: ApiKeyStatus.create(ApiKeyStatusEnum.ACTIVE),
    });
  }

  public isExpired(at: Date = new Date()): boolean {
    return !!this.props.expiresAt && this.props.expiresAt.getTime() <= at.getTime();
  }

  public isUsable(at: Date = new Date()): boolean {
    return this.status.isUsable() && !this.isExpired(at);
  }

  public hasScope(scope: string): boolean {
    return this.props.scopes.includes('*') || this.props.scopes.includes(scope);
  }

  public recordUsage(at: Date = new Date()): void {
    this.props.usageCount = (this.props.usageCount ?? 0) + 1;
    this.props.lastUsedAt = at;
    this.props.updatedAt = new Date();
  }

  public revoke(): void {
    this.props.status = ApiKeyStatus.create(ApiKeyStatusEnum.REVOKED);
    this.props.revokedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markExpired(): void {
    this.props.status = ApiKeyStatus.create(ApiKeyStatusEnum.EXPIRED);
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      keyPrefix: this.keyPrefix,
      scopes: this.scopes,
      status: this.status.value,
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
      revokedAt: this.revokedAt,
      usageCount: this.usageCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
