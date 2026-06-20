import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { ConnectorCredential, CredentialStatusEnum } from '../domain/connector-credential.entity';
import { CredentialManager } from '../engine/credential-manager';
import { AuthTypeEnum } from '../domain/value-objects';

@Injectable()
export class ConnectorCredentialService {
  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly credentialManager: CredentialManager,
  ) {}

  public async saveCredential(
    tenantId: string,
    connectorId: string,
    authType: AuthTypeEnum,
    data: any,
    options: { instanceId?: string; expiresAt?: Date } = {},
  ): Promise<ConnectorCredential> {
    const { encryptedData, keyId } = this.credentialManager.encrypt(data);

    // Look for existing credential to rotate
    let credential = await this.repository.getActiveCredential(tenantId, connectorId, options.instanceId);

    if (credential) {
      credential.rotate(encryptedData, options.expiresAt);
    } else {
      credential = new ConnectorCredential(crypto.randomUUID(), {
        tenantId,
        connectorId,
        instanceId: options.instanceId,
        authType,
        encryptedData,
        keyId,
        status: CredentialStatusEnum.ACTIVE,
        expiresAt: options.expiresAt,
        rotatedAt: new Date(),
      });
    }

    await this.repository.saveCredential(credential, tenantId);
    return credential;
  }

  public async getDecryptedCredential(
    tenantId: string,
    connectorId: string,
    instanceId?: string,
  ): Promise<any | null> {
    const credential = await this.repository.getActiveCredential(tenantId, connectorId, instanceId);
    if (!credential) {
      return null;
    }
    return this.credentialManager.decrypt(credential.encryptedData);
  }

  public async rotateSecrets(tenantId: string, credentialId: string, newData: any): Promise<ConnectorCredential> {
    const credential = await this.repository.getCredentialById(tenantId, credentialId);
    if (!credential) {
      throw new NotFoundException(`Credential with ID ${credentialId} not found`);
    }

    const { encryptedData } = this.credentialManager.encrypt(newData);
    credential.rotate(encryptedData);
    await this.repository.saveCredential(credential, tenantId);
    return credential;
  }
}
