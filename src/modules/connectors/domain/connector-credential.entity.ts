import { Entity } from '@easydev/shared-kernel';
import { AuthTypeEnum } from './value-objects';

export enum CredentialStatusEnum {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  ROTATING = 'ROTATING',
  REVOKED = 'REVOKED',
}

export interface ConnectorCredentialProps {
  tenantId: string;
  connectorId: string;
  instanceId?: string;
  authType: AuthTypeEnum;
  encryptedData: string;
  keyId?: string;
  status?: CredentialStatusEnum;
  expiresAt?: Date;
  rotatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

/**
 * Holds the encrypted credential payload for a connector. The plaintext secret
 * never lives on the entity — only the ciphertext produced by the credential
 * manager is persisted.
 */
export class ConnectorCredential extends Entity<string> {
  private props: ConnectorCredentialProps;

  constructor(id: string, props: ConnectorCredentialProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || CredentialStatusEnum.ACTIVE,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get connectorId(): string {
    return this.props.connectorId;
  }
  get instanceId(): string | undefined {
    return this.props.instanceId;
  }
  get authType(): AuthTypeEnum {
    return this.props.authType;
  }
  get encryptedData(): string {
    return this.props.encryptedData;
  }
  get keyId(): string | undefined {
    return this.props.keyId;
  }
  get status(): CredentialStatusEnum {
    return this.props.status || CredentialStatusEnum.ACTIVE;
  }
  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }
  get rotatedAt(): Date | undefined {
    return this.props.rotatedAt;
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

  public isExpired(at: Date = new Date()): boolean {
    return !!this.props.expiresAt && this.props.expiresAt.getTime() <= at.getTime();
  }

  public rotate(encryptedData: string, expiresAt?: Date): void {
    this.props.encryptedData = encryptedData;
    this.props.expiresAt = expiresAt;
    this.props.rotatedAt = new Date();
    this.props.status = CredentialStatusEnum.ACTIVE;
    this.props.updatedAt = new Date();
    this.props.version = (this.props.version || 1) + 1;
  }

  public revoke(): void {
    this.props.status = CredentialStatusEnum.REVOKED;
    this.props.updatedAt = new Date();
  }

  /** Serializes without exposing the ciphertext. */
  public toSafeJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      instanceId: this.instanceId,
      authType: this.authType,
      keyId: this.keyId,
      status: this.status,
      expiresAt: this.expiresAt,
      rotatedAt: this.rotatedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
