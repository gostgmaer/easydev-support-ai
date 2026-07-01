import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ChannelService } from '../services/channel.service';
import { ChannelConfigurationService } from '../services/channel-configuration.service';
import {
  CreateChannelDto,
  UpdateChannelDto,
  ChannelQueryDto,
  ChannelConfigurationDto,
} from '../dtos';
import { ChannelTypeEnum } from '../domain/value-objects';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';
import { FeatureFlagService } from '../../settings/services/feature-flag.service';

@ApiTags('Channels')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/channels')
export class ChannelController {
  constructor(
    private readonly channelService: ChannelService,
    private readonly configService: ChannelConfigurationService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Channel created successfully',
  })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateChannelDto,
    @Req() req: any,
  ) {
    // WEBCHAT is the base widget channel every plan already gets for free
    // (widget.embed is unconditionally true at every tier - see
    // tenant-provisioning.service.ts's getPlanFlags). Every other channel
    // type is the actual "multi.channel" upsell.
    if (dto.type !== ChannelTypeEnum.WEBCHAT) {
      const enabled = await this.featureFlagService.resolveFlag(
        tenantId,
        'multi.channel',
      );
      if (!enabled) {
        throw new ForbiddenException(
          `Adding a ${dto.type} channel requires the multi.channel feature. Your current plan only includes the web chat channel - upgrade your plan or contact billing to add more channel types.`,
        );
      }
    }

    const channel = await this.channelService.create(
      tenantId,
      dto,
      req.user?.id,
    );
    return channel.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List and paginate channels' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ChannelQueryDto,
  ) {
    const result = await this.channelService.findPaginated(tenantId, query);
    return {
      data: result.data.map((c) => c.toJSON()),
      total: result.total,
    };
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get channel by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const channel = await this.channelService.findById(tenantId, id);
    return channel.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update channel' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
    @Req() req: any,
  ) {
    const channel = await this.channelService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return channel.toJSON();
  }

  @Put(':id/enable')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Enable channel' })
  async enable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.channelService.enable(tenantId, id, req.user?.id);
  }

  @Put(':id/disable')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable channel' })
  async disable(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.channelService.disable(tenantId, id, req.user?.id);
  }

  @Post(':id/config')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Save channel credentials and configuration' })
  async saveConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChannelConfigurationDto,
    @Req() req: any,
  ) {
    const config = await this.configService.saveConfiguration(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return config.toJSON();
  }

  @Get(':id/config')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get channel credentials and configuration' })
  async getConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const config = await this.configService.getConfiguration(tenantId, id);
    return config.toJSON();
  }

  @Post(':id/rotate-secrets')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Rotate secret tokens for the channel configuration',
  })
  async rotateSecrets(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.configService.rotateSecrets(tenantId, id, req.user?.id);
  }
}
