import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { ConnectorWebhook } from '../domain/connector-webhook.entity';
import { ConfigureWebhookDto } from '../dtos/connector.dto';
import { WebhookDispatcher } from '../engine/webhook-dispatcher';
import { CredentialManager } from '../engine/credential-manager';

@Injectable()
export class ConnectorWebhookService {
  constructor(
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly credentialManager: CredentialManager,
  ) {}

  public async registerWebhook(
    tenantId: string,
    connectorId: string,
    dto: ConfigureWebhookDto,
    instanceId?: string,
  ): Promise<ConnectorWebhook> {
    const webhook = new ConnectorWebhook(crypto.randomUUID(), {
      tenantId,
      connectorId,
      instanceId,
      url: dto.url,
      secret: dto.secret
        ? this.credentialManager.encrypt(dto.secret).encryptedData
        : dto.secret,
      signatureHeader: dto.signatureHeader || 'x-signature',
      events: dto.events || [],
      status: 'ACTIVE',
    });

    await this.repository.saveWebhook(webhook, tenantId);
    return webhook;
  }

  public async handleIncomingWebhook(
    tenantId: string,
    webhookId: string,
    payload: any,
    headers: Record<string, string>,
    rawBody?: string,
  ): Promise<any> {
    return this.webhookDispatcher.dispatch(
      tenantId,
      webhookId,
      payload,
      headers,
      rawBody,
    );
  }

  public async getWebhook(
    tenantId: string,
    webhookId: string,
  ): Promise<ConnectorWebhook> {
    const webhook = await this.repository.getWebhook(tenantId, webhookId);
    if (!webhook) {
      throw new NotFoundException(`Webhook with ID ${webhookId} not found`);
    }
    return webhook;
  }

  public async getWebhooks(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorWebhook[]> {
    return this.repository.findWebhooks(tenantId, connectorId);
  }

  public async deleteWebhook(
    tenantId: string,
    webhookId: string,
  ): Promise<boolean> {
    return this.repository.deleteWebhook(tenantId, webhookId);
  }
}
