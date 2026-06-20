import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerMetricsService } from '../services/customer-metrics.service';
import { CustomerMetricsDto } from '../dtos/customer-metrics.dto';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Customer Metrics')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/customer-metrics')
export class CustomerMetricsController {
  constructor(private readonly metricsService: CustomerMetricsService) {}

  @Put(':customerId')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update customer metrics manually' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CustomerMetricsDto,
  ) {
    const metrics = await this.metricsService.updateMetrics(
      tenantId,
      customerId,
      dto,
    );
    return metrics.toJSON();
  }

  @Post(':customerId/recalculate')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Trigger manual recalculation of customer metrics' })
  async recalculate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    const metrics = await this.metricsService.recalculateMetrics(
      tenantId,
      customerId,
    );
    return metrics.toJSON();
  }
}
