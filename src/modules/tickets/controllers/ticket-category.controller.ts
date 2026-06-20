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
import { TicketCategoryService } from '../services/ticket-category.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Ticket Categories')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/ticket-categories')
export class TicketCategoryController {
  constructor(private readonly categoryService: TicketCategoryService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a ticket category' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateCategoryDto,
    @Req() req: any,
  ) {
    const category = await this.categoryService.create(
      tenantId,
      dto,
      req.user?.id,
    );
    return category.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List ticket categories' })
  async findAll(
    @Headers('x-tenant-id') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const categories = await this.categoryService.findAll(
      tenantId,
      activeOnly === 'true',
    );
    return categories.map((c) => c.toJSON());
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a category by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const category = await this.categoryService.findById(tenantId, id);
    return category.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a category' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    const category = await this.categoryService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return category.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.categoryService.delete(tenantId, id, req.user?.id);
  }
}
