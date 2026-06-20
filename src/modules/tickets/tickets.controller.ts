import { Controller, Get, Post, Body, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Controller('v1/tickets')
@UseGuards(TenantGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  async getTickets(@Headers('x-tenant-id') tenantId: string) {
    return this.ticketsService.findAll(tenantId);
  }

  @Post()
  async createTicket(@Headers('x-tenant-id') tenantId: string, @Body() data: any) {
    return this.ticketsService.createTicket(tenantId, data);
  }

  @Put(':id/status')
  async updateStatus(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body('status') status: string) {
    return this.ticketsService.updateStatus(tenantId, id, status);
  }
}
