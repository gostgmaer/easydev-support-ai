import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { AdminIncidentService } from '../services/admin-incident.service';
import {
  CreateIncidentDto,
  UpdateIncidentStatusDto,
  IncidentQueryDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin Incidents')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/admin/incidents')
export class AdminIncidentController {
  constructor(private readonly incidentService: AdminIncidentService) {}

  @Get()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List operational incidents' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: IncidentQueryDto,
  ) {
    const result = await this.incidentService.listIncidents(tenantId, query);
    return { data: result.data.map((i) => i.toJSON()), total: result.total };
  }

  @Post()
  @Roles('tenant_admin')
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiOperation({ summary: 'Create an incident' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    const incident = await this.incidentService.createIncident(tenantId, dto);
    return incident.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get an incident by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const incident = await this.incidentService.getIncident(tenantId, id);
    return incident.toJSON();
  }

  @Patch(':id/status')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update incident status' })
  async updateStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
  ) {
    const incident = await this.incidentService.updateStatus(tenantId, id, dto);
    return incident.toJSON();
  }

  @Post(':id/resolve')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Resolve an incident' })
  async resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const incident = await this.incidentService.resolveIncident(tenantId, id);
    return incident.toJSON();
  }
}
