import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class WebhookSecurityService {
  private readonly redis: Redis;
  private readonly logger = new Logger(WebhookSecurityService.name);
  private readonly signatureValidityWindowMs = 300000; // 5 minutes
  private redisAvailable = true;

  constructor() {
    // Matches the established resilient pattern used elsewhere in this
    // codebase (e.g. RedisCacheService) - previously a bare client with no
    // lazyConnect/error handler, so a Redis blip would throw uncaught out
    // of validateWebhookRequest() and fail every incoming webhook delivery,
    // not just the replay-dedup check it actually needed Redis for.
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6380', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    this.redis.on('error', (err: Error) => {
      if (this.redisAvailable) {
        this.redisAvailable = false;
        this.logger.warn(
          `Webhook replay-dedup Redis unavailable - signature verification still applies, but replay detection is degraded until it recovers: ${err.message}`,
        );
      }
    });

    this.redis.on('ready', () => {
      this.redisAvailable = true;
    });

    this.redis.connect().catch(() => {
      this.redisAvailable = false;
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
    if (this.redisAvailable) {
      try {
        const signatureProcessed = await this.redis.get(cacheKey);
        if (signatureProcessed) {
          throw new BadRequestException(
            'Replay attack detected: webhook signature already processed',
          );
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(`Replay-dedup check failed, proceeding without it: ${(err as Error)?.message}`);
      }
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

    if (this.redisAvailable) {
      try {
        await this.redis.set(
          cacheKey,
          'processed',
          'EX',
          Math.ceil(this.signatureValidityWindowMs / 1000),
        );
      } catch (err: any) {
        this.logger.warn(`Failed to record processed webhook signature: ${err?.message}`);
      }
    }
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
