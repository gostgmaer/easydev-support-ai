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
import { MessageTemplateService } from '../services/message-template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Message Templates')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: true,
  description: 'Tenant Identifier',
})
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/message-templates')
export class TemplateController {
  constructor(private readonly templateService: MessageTemplateService) {}

  @Post()
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Create a message template' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Template created' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateTemplateDto,
    @Req() req: any,
  ) {
    const template = await this.templateService.create(
      tenantId,
      dto,
      req.user?.id,
    );
    return template.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List message templates' })
  async findPaginated(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: TemplateQueryDto,
  ) {
    const result = await this.templateService.findPaginated(tenantId, query);
    return {
      data: result.data.map((t) => t.toJSON()),
      total: result.total,
    };
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a template by ID' })
  async findById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const template = await this.templateService.findById(tenantId, id);
    return template.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Update a template' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
    @Req() req: any,
  ) {
    const template = await this.templateService.update(
      tenantId,
      id,
      dto,
      req.user?.id,
    );
    return template.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  async delete(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    await this.templateService.delete(tenantId, id, req.user?.id);
  }
}
