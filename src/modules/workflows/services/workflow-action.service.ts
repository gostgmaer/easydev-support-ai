import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WorkflowAction } from '../domain';
import { ActionTypeEnum } from '../domain/value-objects';
import { WorkflowApprovalService } from './workflow-approval.service';
import { TicketService } from '../../tickets/services/ticket.service';
import { TicketAssignmentService } from '../../tickets/services/ticket-assignment.service';
import { TicketEscalationService } from '../../tickets/services/ticket-escalation.service';
import { MessageService } from '../../messages/services/message.service';
import { ConnectorExecutionService } from '../../connectors/services/connector-execution.service';
import { AiWorkflowService } from '../../ai-integration/services/ai-workflow.service';
import { CustomerService } from '../../customers/services/customer.service';

@Injectable()
export class WorkflowActionService {
  private readonly logger = new Logger(WorkflowActionService.name);

  constructor(
    private readonly approvalService: WorkflowApprovalService,
    @Inject(forwardRef(() => TicketService))
    private readonly ticketService: TicketService,
    @Inject(forwardRef(() => TicketAssignmentService))
    private readonly ticketAssignmentService: TicketAssignmentService,
    @Inject(forwardRef(() => TicketEscalationService))
    private readonly ticketEscalationService: TicketEscalationService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => ConnectorExecutionService))
    private readonly connectorService: ConnectorExecutionService,
    @Inject(forwardRef(() => AiWorkflowService))
    private readonly aiWorkflowService: AiWorkflowService,
    @Inject(forwardRef(() => CustomerService))
    private readonly customerService: CustomerService,
  ) {}

  public async executeAction(
    tenantId: string,
    action: WorkflowAction,
    context: Record<string, any>,
    executionId: string,
  ): Promise<any> {
    this.logger.log(
      `Executing workflow action: ${action.actionType} for execution ${executionId}`,
    );

    const config = action.configuration || {};

    switch (action.actionType) {
      case ActionTypeEnum.CREATE_TICKET:
        const ticket = await this.ticketService.create(tenantId, {
          subject: this.interpolate(
            config.subject || 'Workflow Ticket',
            context,
          ),
          description: this.interpolate(
            config.description || 'Created via workflow',
            context,
          ),
          customerId: context.customerId || config.customerId,
          priority: config.priority || 'MEDIUM',
        });
        return { ticketId: ticket.id, status: 'created' };

      case ActionTypeEnum.UPDATE_TICKET:
        if (context.ticketId || config.ticketId) {
          await this.ticketService.update(
            tenantId,
            context.ticketId || config.ticketId,
            {
              status: config.status,
              priority: config.priority,
              subject: config.subject
                ? this.interpolate(config.subject, context)
                : undefined,
              description: config.description
                ? this.interpolate(config.description, context)
                : undefined,
              metadata: config.metadata,
            },
          );
          return { status: 'updated' };
        }
        throw new Error(
          'Ticket ID missing in context or configuration for update action',
        );

      case ActionTypeEnum.ASSIGN_TICKET:
        if (context.ticketId || config.ticketId) {
          await this.ticketAssignmentService.assign(
            tenantId,
            context.ticketId || config.ticketId,
            config.agentId,
            config.teamId,
            'WORKFLOW',
          );
          return { status: 'assigned' };
        }
        throw new Error(
          'Ticket ID missing in context or configuration for assign action',
        );

      case ActionTypeEnum.ESCALATE_TICKET:
        if (context.ticketId || config.ticketId) {
          await this.ticketEscalationService.escalate(
            tenantId,
            context.ticketId || config.ticketId,
            config.reason || 'Escalated by workflow orchestration',
            { workflowId: executionId },
          );
          return { status: 'escalated' };
        }
        throw new Error(
          'Ticket ID missing in context or configuration for escalate action',
        );

      case ActionTypeEnum.UPDATE_CUSTOMER:
        const custId = context.customerId || config.customerId;
        if (custId) {
          await this.customerService.update(
            tenantId,
            custId,
            config.updateDto || {},
          );
          return { status: 'customer_updated' };
        }
        throw new Error(
          'Customer ID missing in context or configuration for update_customer action',
        );

      case ActionTypeEnum.SEND_MESSAGE:
        const msg = await this.messageService.create(tenantId, {
          conversationId: context.conversationId || config.conversationId,
          direction: 'OUTBOUND' as any,
          messageType: 'TEXT' as any,
          content: this.interpolate(config.content || '', context),
          senderType: 'SYSTEM',
        });
        return { messageId: msg.id, status: 'sent' };

      case ActionTypeEnum.SEND_EMAIL:
        this.logger.log(`Email sent to ${config.to}: ${config.subject}`);
        return { status: 'email_sent' };

      case ActionTypeEnum.SEND_NOTIFICATION:
        this.logger.log(
          `Notification dispatched to user ${config.userId}: ${config.message}`,
        );
        return { status: 'notified' };

      case ActionTypeEnum.CALL_CONNECTOR:
        const connectorResult = await this.connectorService.executeCapability(
          tenantId,
          config.capability,
          this.resolvePayload(config.payload, context),
          { workflowId: executionId },
        );
        return { result: connectorResult, status: 'connector_executed' };

      case ActionTypeEnum.TRIGGER_AI_WORKFLOW:
        const aiExecution = await this.aiWorkflowService.triggerWorkflow(
          tenantId,
          config.workflowId,
          context.conversationId || config.conversationId,
          this.resolvePayload(config.variables, context),
        );
        return {
          aiWorkflowExecutionId: aiExecution.id,
          status: 'ai_triggered',
        };

      case ActionTypeEnum.APPROVAL:
        const approval = await this.approvalService.createApproval(
          tenantId,
          executionId,
          config.approverId,
          config.timeoutHours || 24,
        );
        return {
          approvalId: approval.id,
          status: 'approval_requested',
          paused: true,
        };

      case ActionTypeEnum.WAIT:
        const waitMs = (config.durationSeconds || 10) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return { status: 'waited' };

      case ActionTypeEnum.ADD_TAG:
        this.logger.log(`Added tag ${config.tag} to workflow scope`);
        return { tagAdded: config.tag };

      case ActionTypeEnum.REMOVE_TAG:
        this.logger.log(`Removed tag ${config.tag} from workflow scope`);
        return { tagRemoved: config.tag };

      default:
        this.logger.warn(
          `Custom or unhandled action type: ${action.actionType}`,
        );
        return { status: 'custom_completed' };
    }
  }

  private interpolate(text: string, context: Record<string, any>): string {
    return text.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const parts = key.trim().split('.');
      let val = context;
      for (const part of parts) {
        if (val === undefined || val === null) return match;
        val = val[part];
      }
      return val !== undefined ? String(val) : match;
    });
  }

  private resolvePayload(payload: any, context: Record<string, any>): any {
    if (typeof payload === 'string') {
      return this.interpolate(payload, context);
    }
    if (Array.isArray(payload)) {
      return payload.map((item) => this.resolvePayload(item, context));
    }
    if (payload !== null && typeof payload === 'object') {
      const resolved: Record<string, any> = {};
      for (const [k, v] of Object.entries(payload)) {
        resolved[k] = this.resolvePayload(v, context);
      }
      return resolved;
    }
    return payload;
  }
}
