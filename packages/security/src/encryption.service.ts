import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly keys: Record<string, Buffer> = {};
  private readonly activeKeyVersion: string = 'v1';

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY must be set - refusing to encrypt with no configured key');
    }
    const parsedKey = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY).digest();
    this.keys['v1'] = parsedKey;

    if (process.env.ROTATED_KEYS) {
      try {
        const extra = JSON.parse(process.env.ROTATED_KEYS);
        for (const [version, secretValue] of Object.entries(extra)) {
          this.keys[version] = crypto.createHash('sha256').update(secretValue as string).digest();
        }
      } catch {}
    }
  }

  encrypt(text: string, version = this.activeKeyVersion): string {
    const key = this.keys[version];
    if (!key) {
      throw new InternalServerErrorException(`Encryption key version ${version} not configured`);
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${version}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const [version, ivHex, authTagHex, ciphertextHex] = parts;
    const key = this.keys[version];
    if (!key) {
      throw new InternalServerErrorException(`Decryption key version ${version} not configured`);
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
