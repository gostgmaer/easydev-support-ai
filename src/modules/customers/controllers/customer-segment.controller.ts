import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerSegmentService } from '../services/customer-segment.service';
import { CustomerSegmentDto } from '../dtos/customer-segment.dto';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Customer Segments')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/customer-segments')
export class CustomerSegmentController {
  constructor(private readonly segmentService: CustomerSegmentService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a customer segment' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Segment created successfully',
  })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CustomerSegmentDto,
  ) {
    const segment = await this.segmentService.createSegment(tenantId, dto);
    return segment.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List all segments' })
  async findAll(@Headers('x-tenant-id') tenantId: string) {
    const segments = await this.segmentService.findAllSegments(tenantId);
    return segments.map((s) => s.toJSON());
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a segment definition' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: CustomerSegmentDto,
  ) {
    const segment = await this.segmentService.updateSegment(tenantId, id, dto);
    return segment.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a segment' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.segmentService.deleteSegment(tenantId, id);
  }

  @Post(':id/assign')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Assign a customer to a static segment' })
  async assign(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('customerId') customerId: string,
  ) {
    await this.segmentService.assignCustomerToSegment(tenantId, customerId, id);
    return { success: true };
  }

  @Post(':id/remove')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Remove a customer from a segment' })
  async remove(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('customerId') customerId: string,
  ) {
    await this.segmentService.removeCustomerFromSegment(
      tenantId,
      customerId,
      id,
    );
    return { success: true };
  }

  @Get(':id/members')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List all members belonging to a segment' })
  async getMembers(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const members = await this.segmentService.findSegmentMembers(tenantId, id);
    return members.map((m) => m.toJSON());
  }

  @Post(':id/evaluate')
  @Roles('tenant_admin')
  @ApiOperation({
    summary: 'Evaluate and run rules for dynamic segment matching',
  })
  async evaluate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.segmentService.runDynamicSegmentation(tenantId, id);
    return { success: true };
  }
}
