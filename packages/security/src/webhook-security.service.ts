import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class WebhookSecurityService {
  private readonly redis: Redis;
  private readonly signatureValidityWindowMs = 300000; // 5 minutes

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      maxRetriesPerRequest: 1,
    });
  }

  async validateWebhookRequest(
    payload: string,
    signature: string,
    timestamp: string,
    activeSecret: string,
    backupSecret?: string,
    allowedIps?: string[],
    clientIp?: string,
  ): Promise<boolean> {
    if (allowedIps && allowedIps.length > 0 && clientIp) {
      if (!allowedIps.includes(clientIp)) {
        throw new ForbiddenException(
          `Webhook client IP ${clientIp} not in whitelist`,
        );
      }
    }

    const ts = parseInt(timestamp, 10);
    const now = Date.now();
    if (isNaN(ts) || Math.abs(now - ts) > this.signatureValidityWindowMs) {
      throw new BadRequestException(
        'Webhook request timestamp expired or invalid',
      );
    }

    const cacheKey = `webhook:sig:${crypto.createHash('md5').update(signature).digest('hex')}`;
    const signatureProcessed = await this.redis.get(cacheKey);
    if (signatureProcessed) {
      throw new BadRequestException(
        'Replay attack detected: webhook signature already processed',
      );
    }

    const isMatch =
      this.verifySignature(payload, signature, timestamp, activeSecret) ||
      (backupSecret
        ? this.verifySignature(payload, signature, timestamp, backupSecret)
        : false);

    if (!isMatch) {
      throw new ForbiddenException(
        'Invalid webhook signature verification failed',
      );
    }

    await this.redis.set(
      cacheKey,
      'processed',
      'EX',
      Math.ceil(this.signatureValidityWindowMs / 1000),
    );
    return true;
  }

  private verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string,
  ): boolean {
    const signaturePayload = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    const computed = hmac.update(signaturePayload).digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(computed, 'hex'),
      );
    } catch {
      return false;
    }
  }
}
