import {
  Controller,
  Get,
  Post,
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
import { TicketSLAService } from '../services/ticket-sla.service';
import { TicketService } from '../services/ticket.service';
import { ConfigureSlaDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Ticket SLA')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/tickets/:ticketId/sla')
export class TicketSLAController {
  constructor(
    private readonly slaService: TicketSLAService,
    private readonly ticketService: TicketService,
  ) {}

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get the SLA state for a ticket' })
  async get(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
  ) {
    const sla = await this.slaService.getForTicket(tenantId, ticketId);
    return sla.toJSON();
  }

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Configure SLA targets for a ticket' })
  async configure(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketId') ticketId: string,
    @Body() dto: ConfigureSlaDto,
  ) {
    const ticket = await this.ticketService.findById(tenantId, ticketId);
    const sla = await this.slaService.configureForTicket(tenantId, ticket, dto);
    return sla.toJSON();
  }
}
