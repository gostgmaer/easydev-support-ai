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
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { KnowledgeDocumentService } from '../services/knowledge-document.service';
import { KnowledgePermissionService } from '../services/knowledge-permission.service';
import { KnowledgeSyncService } from '../services/knowledge-sync.service';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  PublishDocumentDto,
  AddPermissionDto,
} from '../dtos/knowledge.dto';

@Controller('v1/knowledge-documents')
@UseGuards(TenantGuard, RbacGuard)
export class KnowledgeDocumentController {
  constructor(
    private readonly documentService: KnowledgeDocumentService,
    private readonly permissionService: KnowledgePermissionService,
    private readonly syncService: KnowledgeSyncService,
  ) {}

  @Post()
  @Roles('tenant_admin')
  public async createDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateDocumentDto,
  ) {
    const doc = await this.documentService.createDocument(tenantId, dto);
    return doc.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  public async getDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Headers('x-user-role') role?: string,
    @Headers('x-user-team-id') teamId?: string,
  ) {
    // Check permission
    const hasAccess = await this.permissionService.checkAccess(
      tenantId,
      id,
      teamId,
      role,
      'READ',
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this document');
    }
    const doc = await this.documentService.getDocument(tenantId, id);
    return doc.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  public async findDocuments(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: any,
    @Headers('x-user-role') role?: string,
    @Headers('x-user-team-id') teamId?: string,
  ) {
    const result = await this.documentService.findDocuments(tenantId, query);
    const accessFlags = await Promise.all(
      result.data.map((d) =>
        this.permissionService.checkAccess(
          tenantId,
          d.id,
          teamId,
          role,
          'READ',
        ),
      ),
    );
    const allowed = result.data.filter((_, i) => accessFlags[i]);
    return {
      data: allowed.map((d) => d.toJSON()),
      total: result.total,
    };
  }

  @Put(':id')
  @Roles('tenant_admin')
  public async updateDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @Headers('x-user-role') role?: string,
    @Headers('x-user-team-id') teamId?: string,
  ) {
    const hasAccess = await this.permissionService.checkAccess(
      tenantId,
      id,
      teamId,
      role,
      'WRITE',
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied: Write permission required');
    }
    const doc = await this.documentService.updateDocument(tenantId, id, dto);
    return doc.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Headers('x-user-role') role?: string,
    @Headers('x-user-team-id') teamId?: string,
  ) {
    const hasAccess = await this.permissionService.checkAccess(
      tenantId,
      id,
      teamId,
      role,
      'MANAGE',
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied: Manage permission required');
    }
    await this.documentService.deleteDocument(tenantId, id);
  }

  @Post(':id/publish')
  @Roles('tenant_admin')
  public async publishDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: PublishDocumentDto,
    @Headers('x-user-id') userId: string,
  ) {
    const doc = await this.documentService.publishDocument(
      tenantId,
      id,
      dto,
      userId,
    );
    return doc.toJSON();
  }

  @Post(':id/archive')
  @Roles('tenant_admin')
  public async archiveDocument(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    const doc = await this.documentService.archiveDocument(
      tenantId,
      id,
      userId,
    );
    return doc.toJSON();
  }

  @Post(':id/ingest')
  @Roles('tenant_admin')
  public async triggerIngest(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    await this.syncService.triggerIngestion(tenantId, id);
    return { status: 'ingest_triggered' };
  }

  // ------------------ ACL Permissions ------------------
  @Post(':id/permissions')
  @Roles('tenant_admin')
  public async addPermission(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddPermissionDto,
  ) {
    const perm = await this.permissionService.addPermission(tenantId, id, dto);
    return perm.toJSON();
  }

  @Get(':id/permissions')
  @Roles('tenant_admin')
  public async getPermissions(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const perms = await this.permissionService.getPermissions(tenantId, id);
    return perms.map((p) => p.toJSON());
  }

  @Delete('permissions/:permissionId')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deletePermission(
    @Headers('x-tenant-id') tenantId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.permissionService.deletePermission(tenantId, permissionId);
  }
}
