import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CustomerService } from '../../customers/services/customer.service';
import { TicketService } from '../../tickets/services/ticket.service';
import { CreatePublicTicketDto } from '../dtos/public-help.dto';

/** Public, unauthenticated ticket submission for help-center - mirrors the
 * widget chat controller's find-or-create-customer-by-email pattern, since
 * anonymous visitors have no IAM identity and the real /v1/tickets endpoint
 * requires an agent/admin role. */
@ApiTags('Public Help Center')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('v1/public/tickets')
export class PublicTicketController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly ticketService: TicketService,
  ) {}

  @ApiOperation({ summary: 'Submit a support ticket (public)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreatePublicTicketDto,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }

    let customer = await this.customerService.findByEmail(tenantId, dto.email);
    if (!customer) {
      customer = await this.customerService.create(tenantId, {
        email: dto.email,
        source: 'HELP_CENTER',
        profile: dto.name ? { displayName: dto.name } : undefined,
      });
    }

    const ticket = await this.ticketService.create(tenantId, {
      subject: dto.subject,
      description: dto.description,
      customerId: customer.id,
      priority: dto.priority,
      metadata: dto.category ? { category: dto.category } : undefined,
    });

    return ticket.toJSON();
  }
}
