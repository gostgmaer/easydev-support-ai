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
import { ConversationService } from '../services/conversation.service';
import { ConversationSearchService } from '../services/conversation-search.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationQueryDto,
  MergeConversationsDto,
} from '../dtos';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantInterceptor } from '@easydev/shared-kernel';

@ApiTags('Conversations')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', required: true, description: 'Tenant Identifier' })
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(TenantInterceptor)
@Controller('v1/conversations')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly searchService: ConversationSearchService,
  ) {}

  @Post()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Conversation created' })
  async create(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: CreateConversationDto,
    @Req() req: any,
  ) {
    const conversation = await this.conversationService.create(tenantId, dto, req.user?.id);
    return conversation.toJSON();
  }

  @Get()
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'List, filter, paginate conversations' })
  async findPaginated(@Headers('x-tenant-id') tenantId: string, @Query() query: ConversationQueryDto) {
    const result = await this.conversationService.findPaginated(tenantId, query);
    return {
      data: result.data.map((c) => c.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  @Get('search')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Full text search conversations' })
  async search(@Headers('x-tenant-id') tenantId: string, @Query('q') q: string) {
    const results = await this.searchService.search(tenantId, q || '');
    return results.map((c) => c.toJSON());
  }

  @Post('merge')
  @Roles('tenant_admin')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Merge two conversations' })
  async merge(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: MergeConversationsDto,
    @Req() req: any,
  ) {
    const target = await this.conversationService.merge(tenantId, dto.sourceId, dto.targetId, req.user?.id);
    return target.toJSON();
  }

  @Get(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  async findById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    const conversation = await this.conversationService.findById(tenantId, id);
    return conversation.toJSON();
  }

  @Put(':id')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Update a conversation' })
  async update(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @Req() req: any,
  ) {
    const conversation = await this.conversationService.update(tenantId, id, dto, req.user?.id);
    return conversation.toJSON();
  }

  @Post(':id/resolve')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Resolve a conversation' })
  async resolve(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Req() req: any) {
    const conversation = await this.conversationService.resolve(tenantId, id, req.user?.id);
    return conversation.toJSON();
  }

  @Post(':id/close')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Close a conversation' })
  async close(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const conversation = await this.conversationService.close(tenantId, id, reason, req.user?.id);
    return conversation.toJSON();
  }

  @Post(':id/archive')
  @Roles('tenant_admin', 'support_agent')
  @ApiOperation({ summary: 'Archive a conversation' })
  async archive(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Req() req: any) {
    const conversation = await this.conversationService.archive(tenantId, id, req.user?.id);
    return conversation.toJSON();
  }

  @Post(':id/split')
  @Roles('tenant_admin', 'support_agent')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Split a conversation into a new one' })
  async split(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Req() req: any) {
    const conversation = await this.conversationService.split(tenantId, id, req.user?.id);
    return conversation.toJSON();
  }

  @Delete(':id')
  @Roles('tenant_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a conversation' })
  async delete(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Req() req: any) {
    await this.conversationService.delete(tenantId, id, req.user?.id);
  }
}
