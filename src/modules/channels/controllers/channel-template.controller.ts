import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelTemplateService } from '../services/channel-template.service';
import { ChannelTemplateDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Channel Templates')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/channels/:channelId/templates')
export class ChannelTemplateController {
  constructor(private readonly templateService: ChannelTemplateService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a template for a channel' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Body() dto: ChannelTemplateDto,
    @Req() req: any,
  ) {
    const template = await this.templateService.createTemplate(
      tenantId,
      channelId,
      dto,
      req.user?.id,
    );
    return template.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List all templates for a channel' })
  async findTemplates(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
  ) {
    const templates = await this.templateService.findTemplates(
      tenantId,
      channelId,
    );
    return templates.map((t) => t.toJSON());
  }

  @Get(':name')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get template by name' })
  async findTemplateByName(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Param('name') name: string,
  ) {
    const template = await this.templateService.findTemplateByName(
      tenantId,
      channelId,
      name,
    );
    return template.toJSON();
  }

  @Delete(':name')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template by name' })
  async deleteTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('channelId') channelId: string,
    @Param('name') name: string,
    @Req() req: any,
  ) {
    await this.templateService.deleteTemplate(
      tenantId,
      channelId,
      name,
      req.user?.id,
    );
  }
}
