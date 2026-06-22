import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';
import type {
  IAdminRepository,
  PaginatedResult,
} from '../repositories/admin-repository.interface';
import { Webhook, WebhookRetryPolicy } from '../domain/webhook.entity';
import { AdminEventPublisher } from './admin-event.publisher';
import {
  AdminWebhookCreatedEvent,
  AdminWebhookFailedEvent,
} from '@easydev/shared-events';
import { RegisterWebhookDto, UpdateWebhookDto } from '../dtos';

const DEFAULT_RETRY_POLICY: WebhookRetryPolicy = {
  maxAttempts: 5,
  backoffMs: 5000,
};

@Injectable()
export class AdminWebhookService {
  private readonly logger = new Logger(AdminWebhookService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly secretKey: Buffer;

  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    private readonly eventPublisher: AdminEventPublisher,
  ) {
    const rawKey =
      process.env.ADMIN_WEBHOOK_ENCRYPTION_KEY ||
      'easydev_admin_webhook_secret_key_32_bytes_fallback';
    this.secretKey = crypto.scryptSync(rawKey, 'admin-webhook-salt', 32);
  }

  private encryptSecret(secret: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      iv,
    );
    let decrypted = decipher.update(dataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private sign(secret: string, body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  public verifySignature(
    secret: string,
    body: string,
    signature: string,
  ): boolean {
    const expected = this.sign(secret, body);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  public async registerWebhook(
    tenantId: string,
    dto: RegisterWebhookDto,
  ): Promise<{ webhook: Webhook; secret: string }> {
    const secret = crypto.randomBytes(24).toString('base64url');
    const webhook = Webhook.create(crypto.randomUUID(), {
      tenantId,
      name: dto.name,
      url: dto.url,
      secretEncrypted: this.encryptSecret(secret),
      events: dto.events,
      retryPolicy: dto.retryPolicy || DEFAULT_RETRY_POLICY,
    });
    await this.repository.saveWebhook(webhook, tenantId);
    await this.eventPublisher.publish(
      new AdminWebhookCreatedEvent(tenantId, webhook.id, webhook.url),
    );
    return { webhook, secret };
  }

  public async updateWebhook(
    tenantId: string,
    id: string,
    dto: UpdateWebhookDto,
  ): Promise<Webhook> {
    const webhook = await this.getWebhook(tenantId, id);
    webhook.update({
      name: dto.name,
      url: dto.url,
      events: dto.events,
      retryPolicy: dto.retryPolicy,
    });
    await this.repository.saveWebhook(webhook, tenantId);
    return webhook;
  }

  public async disableWebhook(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.getWebhook(tenantId, id);
    webhook.disable();
    await this.repository.saveWebhook(webhook, tenantId);
    return webhook;
  }

  public async enableWebhook(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.getWebhook(tenantId, id);
    webhook.enable();
    await this.repository.saveWebhook(webhook, tenantId);
    return webhook;
  }

  public async getWebhook(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.repository.getWebhook(tenantId, id);
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    }
    return webhook;
  }

  public async listWebhooks(
    tenantId: string,
    status?: string,
  ): Promise<PaginatedResult<Webhook>> {
    return this.repository.listWebhooks(tenantId, { status });
  }

  public async deleteWebhook(tenantId: string, id: string): Promise<boolean> {
    return this.repository.deleteWebhook(tenantId, id);
  }

  public async dispatchEvent(
    tenantId: string,
    eventName: string,
    payload: unknown,
  ): Promise<void> {
    const webhooks = await this.repository.findWebhooksForEvent(
      tenantId,
      eventName,
    );
    for (const webhook of webhooks) {
      await this.deliver(webhook, tenantId, eventName, payload);
    }
  }

  public async retryDelivery(tenantId: string, id: string): Promise<Webhook> {
    const webhook = await this.getWebhook(tenantId, id);
    await this.deliver(webhook, tenantId, 'admin.webhook.retry', {
      webhookId: webhook.id,
    });
    return webhook;
  }

  private async deliver(
    webhook: Webhook,
    tenantId: string,
    eventName: string,
    payload: unknown,
  ): Promise<void> {
    const secret = this.decryptSecret(webhook.secretEncrypted);
    const body = JSON.stringify({ event: eventName, data: payload, tenantId });
    const signature = this.sign(secret, body);
    const policy = webhook.retryPolicy;

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        await axios.post(webhook.url, body, {
          headers: {
            'Content-Type': 'application/json',
            'x-easydev-signature': signature,
            'x-easydev-event': eventName,
          },
          timeout: 10000,
          validateStatus: (status) => status >= 200 && status < 300,
        });
        webhook.recordDeliverySuccess();
        await this.repository.saveWebhook(webhook, tenantId);
        return;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(
          `Webhook delivery attempt ${attempt}/${policy.maxAttempts} failed for ${webhook.id}: ${err.message}`,
        );
        if (attempt < policy.maxAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, policy.backoffMs * attempt),
          );
        }
      }
    }

    webhook.recordDeliveryFailure();
    await this.repository.saveWebhook(webhook, tenantId);
    await this.eventPublisher.publish(
      new AdminWebhookFailedEvent(
        tenantId,
        webhook.id,
        lastError?.message || 'Unknown delivery failure',
      ),
    );
  }
}
