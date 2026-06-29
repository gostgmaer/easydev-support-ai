import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TicketService } from '../services/ticket.service';
import { TicketAssignmentService } from '../services/ticket-assignment.service';
import { TicketEscalationService } from '../services/ticket-escalation.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  TicketQueryDto,
  AssignTicketDto,
  AutoAssignTicketDto,
  TransferTicketDto,
  EscalateTicketDto,
  ResolveTicketDto,
  TagTicketDto,
  WatchTicketDto,
  BulkTicketStatusDto,
  MergeTicketsDto,
  SplitTicketDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Tickets')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/tickets')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly assignmentService: TicketAssignmentService,
    private readonly escalationService: TicketEscalationService,
  ) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Create a ticket' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Ticket created' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.create(tenantId, dto, req.user?.id);
    return ticket.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List, filter, paginate tickets' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: TicketQueryDto,
  ) {
    const result = await this.ticketService.findPaginated(tenantId, query);
    return {
      data: result.data.map((t) => t.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Get('search')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Search tickets' })
  async search(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: TicketQueryDto,
  ) {
    const result = await this.ticketService.findPaginated(tenantId, {
      ...query,
      search: query.search,
    });
    return {
      data: result.data.map((t) => t.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Get('number/:ticketNumber')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a ticket by its human-friendly number' })
  async findByNumber(
    @Headers('x-tenant-id') tenantId: string,
    @Param('ticketNumber') ticketNumber: string,
  ) {
    const ticket = await this.ticketService.findByNumber(
      tenantId,
      ticketNumber,
    );
    return ticket.toJSON();
  }

  @Post('bulk/status')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Bulk update ticket status' })
  async bulkStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: BulkTicketStatusDto,
    @Req() req: any,
  ) {
    return this.ticketService.bulkUpdateStatus(
      tenantId,
      dto.ticketIds,
      dto.status,
      req.user?.id,
    );
  }

  @Post('merge')
  @Roles('tenant_admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Merge two tickets' })
  async merge(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: MergeTicketsDto,
    @Req() req: any,
  ) {
    const target = await this.ticketService.merge(
      tenantId,
      dto.sourceId,
      dto.targetId,
      req.user?.id,
    );
    return target.toJSON();
  }

  @Post(':id/split')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Split a ticket into two' })
  async split(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: SplitTicketDto,
    @Req() req: any,
  ) {
    const splitOff = await this.ticketService.split(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return splitOff.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a ticket by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const ticket = await this.ticketService.findById(tenantId, id);
    return ticket.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update a ticket' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/assign')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Manually assign a ticket' })
  async assign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.assignmentService.assign(
      tenantId,
      id,
      dto.agentId,
      dto.teamId,
      dto.assignmentType || 'MANUAL',
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/auto-assign')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Auto-assign a ticket via the team engine' })
  async autoAssign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AutoAssignTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.assignmentService.autoAssign(
      tenantId,
      id,
      dto.teamId,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/transfer')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Transfer a ticket to another agent' })
  async transfer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: TransferTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.assignmentService.transfer(
      tenantId,
      id,
      dto.toAgentId,
      dto.toTeamId,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Get(':id/assignments')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List assignment history' })
  async assignments(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const assignments = await this.assignmentService.listAssignments(
      tenantId,
      id,
    );
    return assignments.map((a) => a.toJSON());
  }

  @Post(':id/escalate')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Escalate a ticket' })
  async escalate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: EscalateTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.escalationService.escalate(
      tenantId,
      id,
      dto.reason,
      {
        userId: req.user?.id,
      },
    );
    return ticket.toJSON();
  }

  @Post(':id/start')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Mark a ticket in progress' })
  async start(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.start(tenantId, id, req.user?.id);
    return ticket.toJSON();
  }

  @Post(':id/pending')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({
    summary: 'Mark a ticket as waiting for customer (pauses SLA)',
  })
  async pending(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.waitForCustomer(
      tenantId,
      id,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/resume-sla')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Resume SLA clock when customer has replied' })
  async resumeSla(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.resumeFromWaiting(
      tenantId,
      id,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/resolve')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Resolve a ticket' })
  async resolve(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.resolve(
      tenantId,
      id,
      dto.resolutionSummary,
      req.user?.id,
    );
    return ticket.toJSON();
  }

  @Post(':id/close')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Close a ticket' })
  async close(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.close(tenantId, id, req.user?.id);
    return ticket.toJSON();
  }

  @Post(':id/reopen')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Reopen a ticket' })
  async reopen(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const ticket = await this.ticketService.reopen(tenantId, id, req.user?.id);
    return ticket.toJSON();
  }

  @Post(':id/tags')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Tag a ticket' })
  async addTag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: TagTicketDto,
  ) {
    const ticket = await this.ticketService.addTag(tenantId, id, dto);
    return ticket.toJSON();
  }

  @Delete(':id/tags/:tag')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Remove a tag from a ticket' })
  async removeTag(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('tag') tag: string,
  ) {
    const ticket = await this.ticketService.removeTag(tenantId, id, tag);
    return ticket.toJSON();
  }

  @Post(':id/watchers')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Add a watcher to a ticket' })
  async watch(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: WatchTicketDto,
  ) {
    const ticket = await this.ticketService.watch(tenantId, id, dto);
    return ticket.toJSON();
  }

  @Delete(':id/watchers/:userId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Remove a watcher from a ticket' })
  async unwatch(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    const ticket = await this.ticketService.unwatch(tenantId, id, userId);
    return ticket.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a ticket' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.ticketService.delete(tenantId, id, req.user?.id);
  }
}
