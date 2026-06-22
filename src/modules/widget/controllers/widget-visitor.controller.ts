import {
  Controller,
  Post,
  Body,
  Headers,
  Get,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { WidgetVisitorService } from '../services/widget-visitor.service';
import { IdentifyVisitorDto } from '../dtos/widget.dto';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Widget Visitors')
@Controller('v1/widget/visitor')
export class WidgetVisitorController {
  constructor(private readonly visitorService: WidgetVisitorService) {}

  @ApiOperation({ summary: 'Identify visitor (Public)' })
  @ApiHeader({ name: 'x-tenant-id', required: true })
  @Post('identify')
  public async identifyVisitor(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: IdentifyVisitorDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const visitor = await this.visitorService.identify(tenantId, dto);
    return visitor.toJSON();
  }

  @ApiOperation({ summary: 'Get visitor profile (Admin)' })
  @UseGuards(TenantGuard, RbacGuard)
  @Roles('tenant_admin', 'agent')
  @Get(':anonymousId')
  public async getVisitor(
    @Headers('x-tenant-id') tenantId: string,
    @Param('anonymousId') anonymousId: string,
  ) {
    const visitor = await this.visitorService.getOrCreateAnonymousVisitor(
      tenantId,
      anonymousId,
    );
    return visitor.toJSON();
  }
}
