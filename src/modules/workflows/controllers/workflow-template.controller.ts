import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { WorkflowTemplateService } from '../services/workflow-template.service';
import { CreateTemplateDto, UpdateTemplateDto } from '../dtos/workflow.dto';

@Controller('v1/workflows/templates')
@UseGuards(TenantGuard, RbacGuard)
export class WorkflowTemplateController {
  constructor(private readonly templateService: WorkflowTemplateService) {}

  @Post()
  @Roles('tenant_admin')
  public async createTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    const template = await this.templateService.createTemplate(tenantId, dto);
    return template.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'manager')
  public async getTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const template = await this.templateService.getTemplate(tenantId, id);
    return template.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'manager')
  public async findTemplates(
    @Headers('x-tenant-id') tenantId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const templates = await this.templateService.findTemplates(tenantId, {
      status,
      type,
    });
    return templates.map((t) => t.toJSON());
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    const template = await this.templateService.updateTemplate(
      tenantId,
      id,
      dto,
    );
    return template.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  public async deleteTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.templateService.deleteTemplate(tenantId, id);
    return { success: true };
  }

  @Post(':id/publish')
  @Roles('tenant_admin')
  public async publishVersion(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const versionNumber = await this.templateService.publishVersion(
      tenantId,
      id,
    );
    return { success: true, versionNumber };
  }

  @Post(':id/activate')
  @Roles('tenant_admin')
  public async activateTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const template = await this.templateService.activateTemplate(tenantId, id);
    return template.toJSON();
  }

  @Post(':id/pause')
  @Roles('tenant_admin')
  public async pauseTemplate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const template = await this.templateService.pauseTemplate(tenantId, id);
    return template.toJSON();
  }
}
