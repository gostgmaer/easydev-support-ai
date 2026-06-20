import {
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InboxAssignmentChangedEvent } from '@easydev/shared-events';
import type { IInboxRepository } from '../repositories/inbox-repository.interface';
import { InboxView } from '../domain/inbox-view.aggregate';
import { InboxAssignment } from '../domain/inbox-assignment.entity';
import {
  AssignmentType,
  AssignmentTypeEnum,
} from '../domain/value-objects';
import { InboxEventPublisher } from './inbox-event.publisher';
import { InboxRealtimeService } from './inbox-realtime.service';
import { InboxActivityService } from './inbox-activity.service';
import { AgentAssignmentService } from '../../teams/services/agent-assignment.service';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class InboxAssignmentService {
  private readonly logger = new Logger(InboxAssignmentService.name);

  constructor(
    @Inject('IInboxRepository')
    private readonly inboxRepo: IInboxRepository,
    private readonly agentAssignmentService: AgentAssignmentService,
    private readonly eventPublisher: InboxEventPublisher,
    private readonly realtime: InboxRealtimeService,
    private readonly activityService: InboxActivityService,
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

  private async applyAssignment(
    tenantId: string,
    view: InboxView,
    agentId: string | undefined,
    teamId: string | undefined,
    type: AssignmentTypeEnum,
    assignedBy?: string,
  ): Promise<InboxView> {
    if (type === AssignmentTypeEnum.UNASSIGN) {
      view.unassign();
    } else {
      view.assign(agentId, teamId);
    }
    await this.inboxRepo.saveView(view, tenantId);

    await this.inboxRepo.addAssignment(
      new InboxAssignment(randomUUID(), {
        tenantId,
        conversationId: view.conversationId,
        assignedAgentId: agentId,
        assignedTeamId: teamId,
        assignmentType: AssignmentType.create(type),
      }),
      tenantId,
    );

    await this.eventPublisher.publish(
      new InboxAssignmentChangedEvent(
        tenantId,
        view.conversationId,
        agentId,
        teamId,
      ),
    );
    view.clearEvents();

    await this.realtime.emitAssignmentUpdate(tenantId, {
      conversationId: view.conversationId,
      assignedAgentId: agentId,
      assignedTeamId: teamId,
      assignmentType: type,
    });
    await this.activityService.record(
      tenantId,
      view.conversationId,
      type === AssignmentTypeEnum.UNASSIGN ? 'UNASSIGNED' : 'ASSIGNED',
      assignedBy,
      { agentId, teamId, assignmentType: type },
    );
    await this.auditService.log({
      tenantId,
      userId: assignedBy,
      action: 'INBOX_ASSIGN',
      details: `Conversation ${view.conversationId} ${type} -> agent ${agentId ?? '-'} team ${teamId ?? '-'}`,
    });
    return view;
  }

  async assign(
    tenantId: string,
    conversationId: string,
    agentId: string,
    teamId?: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return (
      await this.applyAssignment(
        tenantId,
        view,
        agentId,
        teamId,
        AssignmentTypeEnum.MANUAL,
        assignedBy,
      )
    ).toJSON();
  }

  async force(
    tenantId: string,
    conversationId: string,
    agentId: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return (
      await this.applyAssignment(
        tenantId,
        view,
        agentId,
        view.assignedTeamId,
        AssignmentTypeEnum.FORCE,
        assignedBy,
      )
    ).toJSON();
  }

  async transfer(
    tenantId: string,
    conversationId: string,
    toAgentId: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return (
      await this.applyAssignment(
        tenantId,
        view,
        toAgentId,
        view.assignedTeamId,
        AssignmentTypeEnum.TRANSFER,
        assignedBy,
      )
    ).toJSON();
  }

  async unassign(
    tenantId: string,
    conversationId: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return (
      await this.applyAssignment(
        tenantId,
        view,
        undefined,
        undefined,
        AssignmentTypeEnum.UNASSIGN,
        assignedBy,
      )
    ).toJSON();
  }

  async assignToTeam(
    tenantId: string,
    conversationId: string,
    teamId: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    return (
      await this.applyAssignment(
        tenantId,
        view,
        undefined,
        teamId,
        AssignmentTypeEnum.TEAM,
        assignedBy,
      )
    ).toJSON();
  }

  /** Round-robin assignment delegated to the Team agent-assignment engine. */
  async roundRobin(
    tenantId: string,
    conversationId: string,
    teamId: string,
    assignedBy?: string,
  ) {
    const view = await this.getViewOrThrow(tenantId, conversationId);
    const priorityWeight: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      URGENT: 4,
    };
    const agentId = await this.agentAssignmentService.assignEntity(
      tenantId,
      teamId,
      conversationId,
      'CONVERSATION',
      { priority: priorityWeight[view.priority] ?? 2 },
    );
    return (
      await this.applyAssignment(
        tenantId,
        view,
        agentId,
        teamId,
        AssignmentTypeEnum.ROUND_ROBIN,
        assignedBy,
      )
    ).toJSON();
  }

  async bulkAssign(
    tenantId: string,
    conversationIds: string[],
    agentId: string,
    assignedBy?: string,
  ): Promise<{ assigned: number; failed: string[] }> {
    let assigned = 0;
    const failed: string[] = [];
    for (const conversationId of conversationIds) {
      try {
        const view = await this.getViewOrThrow(tenantId, conversationId);
        await this.applyAssignment(
          tenantId,
          view,
          agentId,
          view.assignedTeamId,
          AssignmentTypeEnum.MANUAL,
          assignedBy,
        );
        assigned += 1;
      } catch (err) {
        this.logger.warn(
          `Bulk assign skipped ${conversationId}: ${err instanceof Error ? err.message : String(err)}`,
        );
        failed.push(conversationId);
      }
    }
    return { assigned, failed };
  }

  async listAssignments(tenantId: string, conversationId: string) {
    const assignments = await this.inboxRepo.findAssignments(
      tenantId,
      conversationId,
    );
    return assignments.map((a) => a.toJSON());
  }
}
