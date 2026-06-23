import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { InboxViewCreatedEvent } from '@easydev/shared-events';
import type {
  IInboxRepository,
  InboxQueryOptions,
} from '../repositories/inbox-repository.interface';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxFilter } from '../domain/inbox-filter.entity';
import { SavedView } from '../domain/saved-view.entity';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxActivityService } from './inbox-activity.service';
import { InboxRealtimeService } from './inbox-realtime.service';
import { AuditService } from '../../audit/audit.service';
import { CreateFilterDto, CreateSavedViewDto, InboxQueryDto } from '../dtos';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly activityService: InboxActivityService,
    private readonly realtime: InboxRealtimeService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
  ) {}

  private async getViewOrThrow(
    tenantId: string,
    conversationId: string,
  ): Promise<InboxView> {
    const view = await this.inboxRepo.findViewByConversation(
      tenantId,
      conversationId,
    );
    if (!view) {
      throw new NotFoundException(
        `Inbox view for conversation ${conversationId} not found`,
      );
    }
    return view;
  }

  async list(tenantId: string, query: InboxQueryDto) {
    const result = await this.inboxRepo.listViews(tenantId, query);
    return {
      data: result.data.map((v) => v.toJSON()),
      total: result.total,
      nextCursor: result.nextCursor,
    };
  }

  async getCounters(tenantId: string, userId: string) {
    const [byStatus, unassigned, mine, bookmarked] = await Promise.all([
      this.inboxRepo.countByStatus(tenantId, {}),
      this.inboxRepo.listViews(tenantId, { unassigned: true, limit: 1 }),
      this.inboxRepo.listViews(tenantId, {
        assignedAgentId: userId,
        limit: 1,
      }),
      this.inboxRepo.listViews(tenantId, {
        bookmarkedByUserId: userId,
        limit: 1,
      }),
    ]);
    return {
      byStatus,
      unassigned: unassigned.total,
      mine: mine.total,
      bookmarked: bookmarked.total,
    };
  }

  async getConversationView(tenantId: string, conversationId: string) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return view.toJSON();
  }

  async markRead(
    tenantId: string,
    conversationId: string,
    userId?: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.markRead();
    await this.inboxRepo.saveView(view, tenantId);
    await this.realtime.emitStatusChange(tenantId, {
      conversationId,
      unreadCount: 0,
    });
    await this.activityService.record(tenantId, conversationId, 'READ', userId);
  }

  async resolve(
    tenantId: string,
    conversationId: string,
    userId?: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.resolve();
    await this.persistView(view, tenantId);
    await this.activityService.record(
      tenantId,
      conversationId,
      'RESOLVED',
      userId,
    );
  }

  async archive(
    tenantId: string,
    conversationId: string,
    userId?: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.archive();
    await this.persistView(view, tenantId);
    await this.activityService.record(
      tenantId,
      conversationId,
      'ARCHIVED',
      userId,
    );
  }

  /**
   * Whether the AI is still allowed to auto-respond in this conversation.
   * Conversations with no inbox view yet (brand new) default to AI-active.
   * Called by AiResponseService before it generates a reply, so that
   * takeOverFromAi/setAiPaused actually stop the AI instead of just
   * updating a projection nothing reads.
   */
  async isAiActive(
    tenantId: string,
    conversationId: string,
  ): Promise<boolean> {
    const view = await this.inboxRepo.findViewByConversation(
      tenantId,
      conversationId,
    );
    if (!view) return true;
    const metadata = view.metadata || {};
    return metadata.aiHandling !== false && !metadata.aiPaused;
  }

  // ---- AI handoff operations (integrations) ----

  async takeOverFromAi(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.assign(userId, view.assignedTeamId);
    view.setMetadata({ aiHandling: false });
    await this.persistView(view, tenantId);
    await this.activityService.record(
      tenantId,
      conversationId,
      'AI_TAKEOVER',
      userId,
    );
  }

  async returnToAi(
    tenantId: string,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.setMetadata({ aiHandling: true });
    await this.persistView(view, tenantId);
    await this.activityService.record(
      tenantId,
      conversationId,
      'AI_RETURN',
      userId,
    );
  }

  async setAiPaused(
    tenantId: string,
    conversationId: string,
    paused: boolean,
    userId: string,
  ): Promise<void> {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    view.setMetadata({ aiPaused: paused });
    await this.persistView(view, tenantId);
    await this.activityService.record(
      tenantId,
      conversationId,
      paused ? 'AI_PAUSE' : 'AI_RESUME',
      userId,
    );
  }

  async decideAiDraft(
    tenantId: string,
    conversationId: string,
    draftId: string,
    approved: boolean,
    userId: string,
  ): Promise<void> {
    await this.getViewOrThrow(tenantId, conversationId);
    await this.activityService.record(
      tenantId,
      conversationId,
      approved ? 'AI_DRAFT_APPROVED' : 'AI_DRAFT_REJECTED',
      userId,
      { draftId },
    );
  }

  async replayWorkflow(
    tenantId: string,
    conversationId: string,
    workflowId: string,
    userId: string,
  ): Promise<void> {
    await this.getViewOrThrow(tenantId, conversationId);
    await this.queueService.addJob(QUEUES.WORKFLOW, 'workflow-execution-job', {
      trigger: 'INBOX_REPLAY',
      workflowId,
      conversationId,
      tenantId,
    });
    await this.activityService.record(
      tenantId,
      conversationId,
      'WORKFLOW_REPLAY',
      userId,
      { workflowId },
    );
  }

  async retryConnector(
    tenantId: string,
    conversationId: string,
    executionId: string,
    userId: string,
  ): Promise<void> {
    await this.getViewOrThrow(tenantId, conversationId);
    await this.queueService.addJob(QUEUES.CONNECTOR, 'connector-retry-job', {
      executionId,
      conversationId,
      tenantId,
    });
    await this.activityService.record(
      tenantId,
      conversationId,
      'CONNECTOR_RETRY',
      userId,
      { executionId },
    );
  }

  private async persistView(view: InboxView, tenantId: string): Promise<void> {
    await this.inboxRepo.saveView(view, tenantId);
    await this.eventPublisher.publishAll(view.domainEvents);
    view.clearEvents();
    await this.realtime.emitStatusChange(tenantId, view.toJSON());
  }

  // ---- Filters ----

  async createFilter(
    tenantId: string,
    dto: CreateFilterDto,
    userId?: string,
  ): Promise<InboxFilter> {
    const filter = new InboxFilter(randomUUID(), {
      tenantId,
      name: dto.name,
      filterDefinition: dto.filterDefinition,
      isSystem: false,
      isShared: dto.isShared ?? false,
    });
    await this.inboxRepo.saveFilter(filter, tenantId);
    await this.auditService.log({
      tenantId,
      userId,
      action: 'INBOX_FILTER_CREATE',
      details: `Created inbox filter ${dto.name}`,
    });
    return filter;
  }

  async listFilters(tenantId: string): Promise<InboxFilter[]> {
    return this.inboxRepo.listFilters(tenantId);
  }

  async deleteFilter(
    tenantId: string,
    filterId: string,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.inboxRepo.deleteFilter(tenantId, filterId);
    if (!deleted) {
      throw new NotFoundException(
        `Filter ${filterId} not found or is a system filter`,
      );
    }
    return { deleted };
  }

  // ---- Saved views ----

  async createSavedView(
    tenantId: string,
    userId: string,
    dto: CreateSavedViewDto,
  ): Promise<SavedView> {
    const filter = await this.inboxRepo.getFilter(tenantId, dto.filterId);
    if (!filter) {
      throw new NotFoundException(`Filter ${dto.filterId} not found`);
    }
    const savedView = new SavedView(randomUUID(), {
      tenantId,
      userId,
      name: dto.name,
      filterId: dto.filterId,
      sortConfiguration: dto.sortConfiguration,
      columnConfiguration: dto.columnConfiguration,
    });
    await this.inboxRepo.saveSavedView(savedView, tenantId);
    await this.eventPublisher.publish(
      new InboxViewCreatedEvent(tenantId, savedView.id, userId),
    );
    return savedView;
  }

  async listSavedViews(tenantId: string, userId: string): Promise<SavedView[]> {
    return this.inboxRepo.listSavedViews(tenantId, userId);
  }

  async deleteSavedView(
    tenantId: string,
    id: string,
  ): Promise<{ deleted: boolean }> {
    const deleted = await this.inboxRepo.deleteSavedView(tenantId, id);
    if (!deleted) {
      throw new NotFoundException(`Saved view ${id} not found`);
    }
    return { deleted };
  }
}
