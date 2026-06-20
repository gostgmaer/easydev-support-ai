import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ConnectorWebhookService } from '../services/connector-webhook.service';
import { ConfigureWebhookDto } from '../dtos/connector.dto';
import type { Request } from 'express';

@Controller('v1/connectors')
export class ConnectorWebhooksController {
  constructor(private readonly webhookService: ConnectorWebhookService) {}

  @Post(':id/webhooks')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  public async registerWebhook(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') connectorId: string,
    @Query('instanceId') instanceId: string,
    @Body() dto: ConfigureWebhookDto,
  ) {
    const webhook = await this.webhookService.registerWebhook(
      tenantId,
      connectorId,
      dto,
      instanceId || undefined,
    );
    return webhook.toJSON();
  }

  @Get(':id/webhooks')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  public async getWebhooks(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') connectorId: string,
  ) {
    const webhooks = await this.webhookService.getWebhooks(
      tenantId,
      connectorId,
    );
    return webhooks.map((w) => w.toJSON());
  }

  @Delete('webhooks/:webhookId')
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteWebhook(
    @Headers('x-tenant-id') tenantId: string,
    @Param('webhookId') webhookId: string,
  ) {
    await this.webhookService.deleteWebhook(tenantId, webhookId);
  }

  /**
   * Public endpoint triggered by external systems (Shopify, HubSpot, etc.).
   * No Tenant/Rbac guards, tenant context is extracted dynamically from the registered webhook.
   */
  @Post('webhooks/incoming/:webhookId')
  public async handleIncomingWebhook(
    @Param('webhookId') webhookId: string,
    @Headers() headers: Record<string, string>,
    @Body() body: any,
    @Req() req: Request,
  ) {
    // Determine rawBody if available
    const rawBody = (req as any).rawBody || '';

    return this.webhookService.handleIncomingWebhook(
      headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000000', // default fallback if needed, or extract from request
      webhookId,
      body,
      headers,
      rawBody,
    );
  }
}
