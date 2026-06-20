import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InboxSearchService } from '../services/inbox-search.service';
import { InboxSearchDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Inbox Search')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/inbox/search')
export class InboxSearchController {
  constructor(private readonly searchService: InboxSearchService) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Search the inbox projection (Redis-assisted)' })
  async search(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: InboxSearchDto,
  ) {
    return this.searchService.search(tenantId, dto);
  }

  @Get('global')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Global full-text inbox search' })
  async global(
    @Headers('x-tenant-id') tenantId: string,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.global(tenantId, q, limit ? Number(limit) : 25);
  }

  @Get('customer/:customerId')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Search inbox by customer' })
  async byCustomer(
    @Headers('x-tenant-id') tenantId: string,
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.byCustomer(
      tenantId,
      customerId,
      limit ? Number(limit) : 25,
    );
  }
}
