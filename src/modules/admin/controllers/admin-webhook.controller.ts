import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminWebhookService } from '../services/admin-webhook.service';
import { RegisterWebhookDto, UpdateWebhookDto, WebhookQueryDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin Webhooks')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/webhooks')
export class AdminWebhookController {
  constructor(private readonly webhookService: AdminWebhookService) {}

  @Get()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List webhooks' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: WebhookQueryDto,
  ) {
    const result = await this.webhookService.listWebhooks(
      tenantId,
      query.status,
    );
    return { data: result.data.map((w) => w.toJSON()), total: result.total };
  }

  @Post()
  @Roles('tenant_admin')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Webhook created; signing secret returned once',
  })
  @ApiOperation({ summary: 'Register a webhook' })
  async register(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: RegisterWebhookDto,
  ) {
    const { webhook, secret } = await this.webhookService.registerWebhook(
      tenantId,
      dto,
    );
    return { ...webhook.toJSON(), secret };
  }

  @Get(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.getWebhook(tenantId, id);
    return webhook.toJSON();
  }

  @Patch(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    const webhook = await this.webhookService.updateWebhook(tenantId, id, dto);
    return webhook.toJSON();
  }

  @Post(':id/disable')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Disable a webhook' })
  async disable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.disableWebhook(tenantId, id);
    return webhook.toJSON();
  }

  @Post(':id/enable')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Re-enable a disabled or failing webhook' })
  async enable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.enableWebhook(tenantId, id);
    return webhook.toJSON();
  }

  @Post(':id/retry')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Manually retry the most recent delivery' })
  async retry(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const webhook = await this.webhookService.retryDelivery(tenantId, id);
    return webhook.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Delete a webhook' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.webhookService.deleteWebhook(tenantId, id);
  }
}
