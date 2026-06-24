import {
  Injectable,
  Inject,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { db, schema } from '@easydev/database';
import { eq } from 'drizzle-orm';
import { ConnectorMapper } from '../repositories/connector.mapper';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { CredentialManager } from './credential-manager';

@Injectable()
export class WebhookDispatcher {
  private readonly logger = new Logger(WebhookDispatcher.name);

  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly queueService: QueueService,
    private readonly credentialManager: CredentialManager,
  ) {}

  public async dispatch(
    tenantId: string | undefined,
    webhookId: string,
    payload: any,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<any> {
    this.logger.log(`Dispatching incoming webhook event for ID ${webhookId}`);

    // 1. Fetch Webhook configuration directly from database by ID
    const [row] = await db
      .select()
      .from(schema.connectorWebhooks)
      .where(eq(schema.connectorWebhooks.id, webhookId));

    if (!row) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }

    const webhook = ConnectorMapper.webhookToDomain(row);
    const resolvedTenantId = webhook.tenantId;

    if (webhook.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        `Webhook with ID ${webhookId} is currently INACTIVE`,
      );
    }

    // 2. Validate Signature if secret is configured
    if (webhook.secret) {
      const sigHeaderName = webhook.signatureHeader.toLowerCase();
      const incomingSignature = headers[sigHeaderName];

      if (!incomingSignature) {
        throw new UnauthorizedException(
          `Missing signature header: ${webhook.signatureHeader}`,
        );
      }

      const bodyToSign =
        rawBody ||
        (typeof payload === 'string' ? payload : JSON.stringify(payload));
      const decryptedSecret = this.credentialManager.decryptIfEncrypted(
        webhook.secret,
      );
      const expectedSignature = crypto
        .createHmac('sha256', decryptedSecret)
        .update(bodyToSign)
        .digest('hex');

      const isBufferEqual = this.safeCompare(
        incomingSignature,
        expectedSignature,
      );
      if (!isBufferEqual) {
        this.logger.warn(
          `Signature verification failed for webhook ID ${webhookId}`,
        );
        throw new UnauthorizedException('Signature verification failed');
      }
    }

    // 3. Queue the webhook job for asynchronous processing
    await this.queueService.addJob(QUEUES.CONNECTOR, 'connector-webhook-job', {
      tenantId: resolvedTenantId,
      webhookId,
      payload,
      headers,
      triggeredAt: new Date(),
    });

    // 4. Update last triggered timestamp
    webhook.markTriggered(new Date());
    await this.repository.saveWebhook(webhook, resolvedTenantId);

    return { status: 'dispatched', webhookId, tenantId: resolvedTenantId };
  }

  private safeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) {
        return false;
      }
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
