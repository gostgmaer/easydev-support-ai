import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WidgetInstallationService } from '../services/widget-installation.service';
import { CreateInstallationDto } from '../dtos/widget.dto';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Widget Installation')
@UseGuards(TenantGuard, RbacGuard)
@Controller('v1/widget/installations')
export class WidgetInstallationController {
  constructor(
    private readonly installationService: WidgetInstallationService,
  ) {}

  @ApiOperation({ summary: 'Create domain installation' })
  @Roles('tenant_admin')
  @Post()
  public async createInstallation(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateInstallationDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const install = await this.installationService.createInstallation(
      tenantId,
      dto,
    );
    return install.toJSON();
  }

  @ApiOperation({ summary: 'Verify domain installation' })
  @Roles('tenant_admin')
  @Post('verify')
  public async verifyInstallation(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { domain: string },
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    if (!body.domain) {
      throw new BadRequestException('Missing domain name');
    }
    const install = await this.installationService.verifyInstallation(
      tenantId,
      body.domain,
    );
    return install.toJSON();
  }

  @ApiOperation({ summary: 'Get widget installation script' })
  @Roles('tenant_admin', 'support_agent')
  @Get('script')
  public getScript(
    @Headers('x-tenant-id') tenantId: string,
    @Query('domain') domain: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    if (!domain) {
      throw new BadRequestException('Missing domain name');
    }
    const script = this.installationService.generateInstallationScript(
      tenantId,
      domain,
    );
    return { script };
  }
}
