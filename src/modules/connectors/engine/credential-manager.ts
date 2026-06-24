import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import { ConnectorCredential } from '../domain/connector-credential.entity';
import { IConnectorRepository } from '../repositories/connector-repository.interface';

// Legacy ciphertext (encrypted before the AES-256-GCM migration): iv:ciphertext.
const LEGACY_CIPHERTEXT_SHAPE = /^[0-9a-f]+:[0-9a-f]+$/i;
// Current ciphertext: iv:authTag:ciphertext.
const GCM_CIPHERTEXT_SHAPE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

@Injectable()
export class CredentialManager {
  private readonly logger = new Logger(CredentialManager.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly legacyAlgorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor() {
    const rawKey = process.env.CONNECTOR_ENCRYPTION_KEY;
    if (!rawKey) {
      // A hardcoded fallback here would mean every credential/webhook secret
      // encrypted under it is decryptable by anyone who has ever read this
      // source file - that's not encryption, it's obfuscation. Fail closed
      // instead of silently running with a publicly-known key.
      throw new Error(
        'CONNECTOR_ENCRYPTION_KEY must be set - refusing to start with no connector credential encryption key',
      );
    }
    // Ensure the key is exactly 32 bytes
    this.secretKey = crypto.scryptSync(rawKey, 'salt', 32);
  }

  public encrypt(data: any): { encryptedData: string; keyId: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const encryptedPayload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return {
      encryptedData: encryptedPayload,
      keyId: 'v2',
    };
  }

  public decrypt<T = any>(encryptedData: string): T {
    try {
      const parts = encryptedData.split(':');

      let decrypted: string;
      if (parts.length === 3) {
        const [ivHex, authTagHex, encryptedText] = parts;
        const decipher = crypto.createDecipheriv(
          this.algorithm,
          this.secretKey,
          Buffer.from(ivHex, 'hex'),
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      } else if (parts.length === 2) {
        // Pre-migration ciphertext (AES-256-CBC, no auth tag). Still
        // readable so already-stored credentials/webhook secrets don't
        // break on this deploy - they get re-encrypted under GCM the next
        // time they're rotated/re-registered.
        const decipher = crypto.createDecipheriv(
          this.legacyAlgorithm,
          this.secretKey,
          Buffer.from(parts[0], 'hex'),
        );
        decrypted = decipher.update(parts[1], 'hex', 'utf8');
        decrypted += decipher.final('utf8');
      } else {
        throw new Error('Invalid encrypted data format');
      }

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

  /**
   * For fields that predate encryption entirely (e.g. connector_webhooks.secret,
   * which was stored as raw plaintext until this fix) - decrypts if the value
   * looks like our ciphertext shape, otherwise returns it unchanged. Lets
   * already-stored plaintext secrets keep working until they're rotated.
   */
  public decryptIfEncrypted(value: string): string {
    if (!value) return value;
    if (GCM_CIPHERTEXT_SHAPE.test(value) || LEGACY_CIPHERTEXT_SHAPE.test(value)) {
      try {
        return this.decrypt<string>(value);
      } catch {
        return value;
      }
    }
    return value;
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
