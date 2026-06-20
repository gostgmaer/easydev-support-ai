import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { ConnectorCredential } from '../domain/connector-credential.entity';
import { IConnectorRepository } from '../repositories/connector-repository.interface';

@Injectable()
export class CredentialManager {
  private readonly logger = new Logger(CredentialManager.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    const rawKey =
      process.env.CONNECTOR_ENCRYPTION_KEY ||
      'easydev_connector_secret_key_32_bytes_long_fallback';
    // Ensure the key is exactly 32 bytes
    this.secretKey = crypto.scryptSync(rawKey, 'salt', 32);
  }

  public encrypt(data: any): { encryptedData: string; keyId: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedPayload = `${iv.toString('hex')}:${encrypted}`;
    return {
      encryptedData: encryptedPayload,
      keyId: 'v1',
    };
  }

  public decrypt<T = any>(encryptedData: string): T {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.secretKey,
        iv,
      );

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted) as T;
      } catch {
        return decrypted as unknown as T;
      }
    } catch (error: any) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error(`Credential decryption failed: ${error.message}`);
    }
  }

  public async refreshOAuthToken(
    tenantId: string,
    credential: ConnectorCredential,
    repository: IConnectorRepository,
  ): Promise<ConnectorCredential> {
    const dec = this.decrypt<any>(credential.encryptedData);
    if (
      credential.authType !== 'OAUTH2' ||
      !dec.refreshToken ||
      !dec.tokenUrl
    ) {
      return credential;
    }

    this.logger.log(
      `Refreshing OAuth token for connector credential ${credential.id} under tenant ${tenantId}`,
    );

    try {
      const response = await axios.post(
        dec.tokenUrl,
        {
          grant_type: 'refresh_token',
          client_id: dec.clientId,
          client_secret: dec.clientSecret,
          refresh_token: dec.refreshToken,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      const { access_token, expires_in, refresh_token } = response.data;

      const newDec = {
        ...dec,
        accessToken: access_token,
        refreshToken: refresh_token || dec.refreshToken, // keep old if not returned
      };

      const { encryptedData, keyId } = this.encrypt(newDec);

      const expiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : undefined;
      credential.rotate(encryptedData, expiresAt);

      await repository.saveCredential(credential, tenantId);

      this.logger.log(
        `OAuth token refreshed successfully for credential ${credential.id}`,
      );
      return credential;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh OAuth token for credential ${credential.id}: ${error.message}`,
      );
      throw new Error(`OAuth token refresh failed: ${error.message}`);
    }
  }
}
