import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AgentAvailabilityService } from '../services/agent-availability.service';
import { UpdateAvailabilityDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Agent Availability')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AgentAvailabilityService) {}

  @Get(':agentProfileId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get agent availability status' })
  async getAvailability(
    @Headers('x-tenant-id') tenantId: string,
    @Param('agentProfileId') agentProfileId: string,
  ) {
    const availability = await this.availabilityService.getAvailability(
      tenantId,
      agentProfileId,
    );
    return availability.toJSON();
  }

  @Put(':agentProfileId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update agent availability status or shift slots' })
  async updateAvailability(
    @Headers('x-tenant-id') tenantId: string,
    @Param('agentProfileId') agentProfileId: string,
    @Body() dto: UpdateAvailabilityDto,
    @Req() req: any,
  ) {
    const availability = await this.availabilityService.updateAvailability(
      tenantId,
      agentProfileId,
      dto,
      req.user?.id,
    );
    return availability.toJSON();
  }
}
