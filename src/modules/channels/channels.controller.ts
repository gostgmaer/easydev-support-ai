import { Controller, Post, Body, Headers, Param, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';

@Controller('v1/channels')
export class ChannelsController {
  private readonly logger = new Logger(ChannelsController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post(':provider/webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-tenant-id') tenantId: string, // Simplified for now. In prod, tenantId might come from webhook URL or payload.
    @Headers('x-hub-signature') signature: string, // For FB/WhatsApp validation
  ) {
    this.logger.log(`Received webhook from ${provider} for tenant ${tenantId}`);
    
    // We instantly return 200 OK to the provider to avoid timeout, 
    // processing happens asynchronously via BullMQ in the WebhookService
    this.webhookService.processIncomingWebhook(tenantId, provider, payload, signature).catch((err) => {
      this.logger.error(`Error processing webhook async: ${err.message}`);
    });

    return { status: 'received' };
  }
}
