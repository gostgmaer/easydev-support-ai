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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CustomerService } from '../services/customer.service';
import { CustomerProfileService } from '../services/customer-profile.service';
import { CustomerTimelineService } from '../services/customer-timeline.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto, CreateCustomerProfileDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly profileService: CustomerProfileService,
    private readonly timelineService: CustomerTimelineService
  ) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Customer created successfully' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCustomerDto,
    @Req() req: any
  ) {
    const customer = await this.customerService.create(tenantId, dto, req.user?.id);
    return customer.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List, filter, paginate and search customers' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: CustomerQueryDto
  ) {
    const result = await this.customerService.findPaginated(tenantId, query);
    return {
      data: result.data.map((c) => c.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Get('export')
  @Roles('tenant_admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Export customers as CSV or JSON' })
  async export(
    @Headers('x-tenant-id') tenantId: string,
    @Query('format') format: 'CSV' | 'JSON' = 'CSV'
  ) {
    const data = await this.customerService.export(tenantId, format);
    return { data, format };
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get Customer 360 view by ID' })
  async findById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const customer = await this.customerService.findById(tenantId, id);
    return customer.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update an existing customer' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: any
  ) {
    const customer = await this.customerService.update(tenantId, id, dto, req.user?.id);
    return customer.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin', 'support_agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a customer' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any
  ) {
    await this.customerService.delete(tenantId, id, req.user?.id);
  }

  @Post(':id/restore')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Restore a soft deleted customer' })
  async restore(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any
  ) {
    await this.customerService.restore(tenantId, id, req.user?.id);
    return { success: true };
  }

  @Put(':id/profile')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update customer profile properties' })
  async updateProfile(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerProfileDto
  ) {
    const profile = await this.profileService.updateProfile(tenantId, id, dto);
    return profile.toJSON();
  }

  @Get(':id/timeline')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get customer interaction timeline' })
  async getTimeline(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.timelineService.getTimeline(tenantId, id);
  }

  @Post('merge')
  @Roles('tenant_admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Merge two customers together' })
  async merge(
    @Headers('x-tenant-id') tenantId: string,
    @Body('sourceId') sourceId: string,
    @Body('targetId') targetId: string,
    @Req() req: any
  ) {
    const target = await this.customerService.merge(tenantId, sourceId, targetId, req.user?.id);
    return target.toJSON();
  }

  @Post('bulk-import')
  @Roles('tenant_admin')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Bulk import customers' })
  async bulkImport(
    @Headers('x-tenant-id') tenantId: string,
    @Body('records') records: any[],
    @Req() req: any
  ) {
    return this.customerService.import(tenantId, records, req.user?.id);
  }
}
