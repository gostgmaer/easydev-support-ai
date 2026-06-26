import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error(
        'ENCRYPTION_KEY must be set - refusing to encrypt with no configured key',
      );
    }
    this.key = Buffer.alloc(32);
    Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8').copy(this.key);
  }

  public encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  public decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error('Malformed cipher text structure');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public maskPII(
    text: string,
    type: 'email' | 'phone' | 'ip' | 'generic',
  ): string {
    if (!text) return '';

    switch (type) {
      case 'email':
        const parts = text.split('@');
        if (parts.length !== 2) return '***';
        const name = parts[0];
        const domain = parts[1];
        if (name.length <= 2) return `*@${domain}`;
        return `${name[0]}***${name[name.length - 1]}@${domain}`;

      case 'phone':
        if (text.length < 5) return '***';
        return `${text.substring(0, 3)}***${text.substring(text.length - 2)}`;

      case 'ip':
        // Mask IPv4/IPv6
        if (text.includes('.')) {
          const blocks = text.split('.');
          if (blocks.length === 4) return `${blocks[0]}.${blocks[1]}.***.***`;
        }
        return '***';

      case 'generic':
      default:
        if (text.length <= 2) return '**';
        return `${text[0]}***${text[text.length - 1]}`;
    }
  }

  public redactSensitiveData(
    data: Record<string, any>,
    sensitiveKeys: string[] = ['password', 'secret', 'token', 'apiKey', 'auth'],
  ): Record<string, any> {
    const redacted = { ...data };
    for (const key of Object.keys(redacted)) {
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key], sensitiveKeys);
      } else if (
        sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))
      ) {
        redacted[key] = '[REDACTED]';
      }
    }
    return redacted;
  }
}
