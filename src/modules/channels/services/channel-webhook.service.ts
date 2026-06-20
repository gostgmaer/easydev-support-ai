import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { IChannelRepository } from '../repositories/channel-repository.interface';
import { ChannelWebhook } from '../domain/channel-webhook.entity';
import { ChannelWebhookDto } from '../dtos';
import { ChannelConnectorRegistry } from '../connectors/channel-connector.registry';
import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/audit.service';
import { ChannelEventPublisher } from './channel-event.publisher';
import { WebhookReceivedEvent } from '@easydev/shared-events';
import { QueueService } from '@easydev/shared-queues';

@Injectable()
export class ChannelWebhookService {
  private readonly logger = new Logger(ChannelWebhookService.name);

  constructor(
    @Inject('IChannelRepository')
    private readonly channelRepo: IChannelRepository,
    private readonly connectorRegistry: ChannelConnectorRegistry,
    private readonly eventPublisher: ChannelEventPublisher,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async registerWebhook(
    tenantId: string,
    channelId: string,
    dto: ChannelWebhookDto,
    userId?: string,
  ): Promise<ChannelWebhook> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    let webhook = await this.channelRepo.findWebhookByChannelId(
      channelId,
      tenantId,
    );
    if (webhook) {
      webhook.update({
        webhookUrl: dto.webhookUrl,
        webhookSecret: dto.webhookSecret || webhook.webhookSecret,
        verificationToken: dto.verificationToken || webhook.verificationToken,
      });
    } else {
      webhook = new ChannelWebhook(randomUUID(), {
        tenantId,
        channelId,
        webhookUrl: dto.webhookUrl,
        webhookSecret: dto.webhookSecret || randomUUID(),
        verificationToken: dto.verificationToken || randomUUID(),
      });
    }

    await this.channelRepo.saveWebhook(webhook, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CHANNEL_WEBHOOK_REGISTER',
      details: `Registered webhook for channel ${channelId}`,
    });

    return webhook;
  }

  async verifyWebhook(
    tenantId: string,
    channelId: string,
    query: Record<string, any>,
  ): Promise<string> {
    const webhook = await this.channelRepo.findWebhookByChannelId(
      channelId,
      tenantId,
    );
    if (!webhook)
      throw new NotFoundException(
        `Webhook config for channel ${channelId} not found`,
      );

    // Common query parameters: hub.mode, hub.challenge, hub.verify_token (WhatsApp/Messenger)
    const mode = query['hub.mode'] || query['mode'];
    const token = query['hub.verify_token'] || query['token'];
    const challenge = query['hub.challenge'] || query['challenge'];

    if (mode && token) {
      if (token === webhook.verificationToken) {
        return challenge || 'OK';
      }
      throw new BadRequestException('Verification token mismatch');
    }
    return 'OK';
  }

  async handleIncomingWebhook(
    tenantId: string,
    channelId: string,
    payload: any,
    headers: Record<string, any>,
  ): Promise<void> {
    const channel = await this.channelRepo.findById(channelId, tenantId);
    if (!channel) throw new NotFoundException(`Channel ${channelId} not found`);

    const webhook = await this.channelRepo.findWebhookByChannelId(
      channelId,
      tenantId,
    );
    if (!webhook)
      throw new NotFoundException(`Webhook for channel ${channelId} not found`);

    const connector = this.connectorRegistry.getConnector(channel.type.value);

    // Signature/validation checks
    const signature =
      headers['x-hub-signature-256'] || headers['signature'] || '';
    if (webhook.webhookSecret && signature) {
      const isSignatureValid = await connector.verifySignature(
        tenantId,
        channelId,
        payload,
        signature,
        webhook.webhookSecret,
      );
      if (!isSignatureValid) {
        throw new BadRequestException('Invalid signature');
      }
    }

    const isValid = await connector.validateWebhook(
      tenantId,
      channelId,
      payload,
      headers,
    );
    if (!isValid) {
      throw new BadRequestException('Webhook payload validation failed');
    }

    // Update webhook timestamp
    webhook.update({ lastReceivedAt: new Date() });
    await this.channelRepo.saveWebhook(webhook, tenantId);

    // Publish event
    const webhookId = randomUUID();
    await this.eventPublisher.publish(
      new WebhookReceivedEvent(tenantId, webhookId, channelId, payload),
    );

    // Dispatch to incoming queue for async processing
    await this.queueService.addJob('channel-queue', 'incoming-message-job', {
      channelId,
      payload,
      headers,
    });
  }
}
