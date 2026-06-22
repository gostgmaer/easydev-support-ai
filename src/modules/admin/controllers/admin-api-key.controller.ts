import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminApiKeyService } from '../services/admin-api-key.service';
import { CreateApiKeyDto, ApiKeyQueryDto, ValidateApiKeyDto } from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Admin API Keys')
@Controller('v1/admin/api-keys')
export class AdminApiKeyController {
  constructor(private readonly apiKeyService: AdminApiKeyService) {}

  private userOf(req: any): string {
    const userId = req.user?.id;
    if (!userId)
      throw new BadRequestException('Authenticated user is required');
    return userId;
  }

  // Validation authenticates the caller via the raw key itself, so it is
  // deliberately not gated behind TenantGuard/RbacGuard (which require a
  // tenant JWT the caller does not have at this point).
  @Post('validate')
  @ApiOperation({ summary: 'Validate a raw API key and its scope' })
  async validate(@Body() dto: ValidateApiKeyDto) {
    const { apiKey, tenantId } = await this.apiKeyService.validateApiKey(
      dto.rawKey,
      dto.requiredScope,
    );
    return { valid: true, tenantId, apiKey: apiKey.toJSON() };
  }

  @Get()
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'List API keys' })
  async list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ApiKeyQueryDto,
  ) {
    const result = await this.apiKeyService.listApiKeys(tenantId, query.status);
    return { data: result.data.map((k) => k.toJSON()), total: result.total };
  }

  @Post()
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API key created; raw key returned once',
  })
  @ApiOperation({ summary: 'Create an API key' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: any,
  ) {
    const { apiKey, rawKey } = await this.apiKeyService.createApiKey(
      tenantId,
      dto,
      this.userOf(req),
    );
    return { ...apiKey.toJSON(), rawKey };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Get an API key by ID' })
  async getById(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
  ) {
    const apiKey = await this.apiKeyService.getApiKey(tenantId, id);
    return apiKey.toJSON();
  }

  @Post(':id/rotate')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Rotate an API key' })
  async rotate(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const { apiKey, rawKey } = await this.apiKeyService.rotateApiKey(
      tenantId,
      id,
      this.userOf(req),
    );
    return { ...apiKey.toJSON(), rawKey };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-tenant-id',
    required: true,
    description: 'Tenant Identifier',
  })
  @UseGuards(TenantGuard, RbacGuard)
  @UseInterceptors(TenantInterceptor)
  @Roles('tenant_admin')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const apiKey = await this.apiKeyService.revokeApiKey(
      tenantId,
      id,
      this.userOf(req),
    );
    return apiKey.toJSON();
  }
}
