import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WidgetConfigService } from '../services/widget-config.service';
import { UpdateWidgetConfigDto } from '../dtos/widget.dto';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Configuration')
@Controller('v1/widget/config')
export class WidgetConfigController {
  constructor(private readonly configService: WidgetConfigService) {}

  @ApiOperation({ summary: 'Get widget configuration (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Get()
  public async getPublicConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('origin') origin?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }

    // Validate domain if origin exists
    if (origin) {
      const isValidDomain = await this.configService.validateDomain(
        tenantId,
        origin,
      );
      if (!isValidDomain) {
        throw new BadRequestException('Domain origin not allowed');
      }
    }

    const config = await this.configService.getOrCreateConfig(tenantId);
    return config.toJSON();
  }

  @ApiOperation({ summary: 'Get widget configuration (Admin)' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin', 'agent')
  @Get('admin')
  public async getAdminConfig(@Headers('x-tenant-id') tenantId: string) {
    const config = await this.configService.getOrCreateConfig(tenantId);
    return config.toAdminJSON();
  }

  @ApiOperation({
    summary: 'Rotate the widget identity-verification secret (Admin)',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Post('admin/rotate-identity-secret')
  public async rotateIdentitySecret(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const config = await this.configService.rotateIdentitySecret(tenantId);
    return config.toAdminJSON();
  }

  @ApiOperation({ summary: 'Update widget configuration (Admin)' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin')
  @Put()
  public async updateConfig(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateWidgetConfigDto,
  ) {
    const config = await this.configService.updateConfig(tenantId, dto);
    return config.toJSON();
  }
}
