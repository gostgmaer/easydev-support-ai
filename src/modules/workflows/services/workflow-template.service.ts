import { Injectable, Inject, NotFoundException, OnApplicationBootstrap, Logger } from '@nestjs/common';
import type { IWorkflowRepository } from '../repositories/workflow-repository.interface';
import { WorkflowTemplate, WorkflowTrigger, WorkflowCondition, WorkflowAction } from '../domain';
import { CreateTemplateDto, UpdateTemplateDto } from '../dtos/workflow.dto';
import { WorkflowStatusEnum, WorkflowTypeEnum, TriggerTypeEnum, ActionTypeEnum } from '../domain/value-objects';
import { WorkflowEventPublisher } from './workflow-event.publisher';
import {
  WorkflowCreatedEvent,
  WorkflowUpdatedEvent,
  WorkflowActivatedEvent,
  WorkflowPausedEvent,
} from '@easydev/shared-events';
import * as crypto from 'crypto';

@Injectable()
export class WorkflowTemplateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkflowTemplateService.name);

  constructor(
    @Inject('IWorkflowRepository')
    private readonly repository: IWorkflowRepository,
    private readonly eventPublisher: WorkflowEventPublisher,
  ) {}

  public async onApplicationBootstrap() {
    this.logger.log('Seeding system workflow templates...');
    const tenantId = '00000000-0000-0000-0000-000000000000';
    try {
      const existing = await this.repository.findTemplates(tenantId);
      const systemTemplates = existing.filter((t) => t.isSystem);
      if (systemTemplates.length > 0) {
        this.logger.log('System templates already seeded.');
        return;
      }

      const templatesToSeed = [
        {
          name: 'Refund Request',
          description: 'Auto-escalates high-value refund requests for manual approval',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.TICKET_CREATED, configuration: {} }],
          conditions: [{ field: 'amount', operator: 'GT', value: '500' }],
          actions: [
            {
              actionType: ActionTypeEnum.APPROVAL,
              configuration: { approverId: '00000000-0000-0000-0000-000000000000', timeoutHours: 24 },
              sequenceOrder: 1,
            },
            {
              actionType: ActionTypeEnum.ESCALATE_TICKET,
              configuration: { reason: 'High value refund request approved' },
              sequenceOrder: 2,
            },
          ],
        },
        {
          name: 'Order Escalation',
          description: 'Escalates order disputes and delivery failures',
          workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.MESSAGE_RECEIVED, configuration: {} }],
          conditions: [{ field: 'subject', operator: 'CONTAINS', value: 'order' }],
          actions: [
            {
              actionType: ActionTypeEnum.ESCALATE_TICKET,
              configuration: { reason: 'Order dispute in customer message' },
              sequenceOrder: 1,
            },
          ],
        },
        {
          name: 'VIP Customer Escalation',
          description: 'Escalates tickets from VIP customers directly to senior support',
          workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.TICKET_CREATED, configuration: {} }],
          conditions: [{ field: 'customerSegment', operator: 'EQUALS', value: 'VIP' }],
          actions: [
            {
              actionType: ActionTypeEnum.ASSIGN_TICKET,
              configuration: { teamId: '00000000-0000-0000-0000-000000000000', agentId: '00000000-0000-0000-0000-000000000000' },
              sequenceOrder: 1,
            },
          ],
        },
        {
          name: 'SLA Breach Escalation',
          description: 'Handles SLA breaches by notifying managers and reassigning ticket',
          workflowType: WorkflowTypeEnum.ESCALATION_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.SLA_BREACHED, configuration: {} }],
          conditions: [{ field: 'priority', operator: 'EQUALS', value: 'HIGH' }],
          actions: [
            {
              actionType: ActionTypeEnum.SEND_NOTIFICATION,
              configuration: { message: 'High priority SLA breach occurred!' },
              sequenceOrder: 1,
            },
            {
              actionType: ActionTypeEnum.ASSIGN_TICKET,
              configuration: { teamId: '00000000-0000-0000-0000-000000000000' },
              sequenceOrder: 2,
            },
          ],
        },
        {
          name: 'Customer Follow-up',
          description: 'Auto-sends follow-up message when conversation is resolved',
          workflowType: WorkflowTypeEnum.CUSTOMER_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.TICKET_UPDATED, configuration: {} }],
          conditions: [{ field: 'status', operator: 'EQUALS', value: 'RESOLVED' }],
          actions: [
            {
              actionType: ActionTypeEnum.SEND_MESSAGE,
              configuration: { message: 'Thank you for contacting support. Your issue has been marked resolved.' },
              sequenceOrder: 1,
            },
          ],
        },
        {
          name: 'Ticket Auto Assignment',
          description: 'Auto-assigns low priority tickets to the default support pool',
          workflowType: WorkflowTypeEnum.TICKET_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.TICKET_CREATED, configuration: {} }],
          conditions: [{ field: 'priority', operator: 'EQUALS', value: 'LOW' }],
          actions: [
            {
              actionType: ActionTypeEnum.ASSIGN_TICKET,
              configuration: { teamId: '00000000-0000-0000-0000-000000000000' },
              sequenceOrder: 1,
            },
          ],
        },
        {
          name: 'Conversation Auto Routing',
          description: 'Routes new conversation to appropriate department team',
          workflowType: WorkflowTypeEnum.CONVERSATION_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.CONVERSATION_CREATED, configuration: {} }],
          conditions: [{ field: 'source', operator: 'EQUALS', value: 'WEBCHAT' }],
          actions: [
            {
              actionType: ActionTypeEnum.ASSIGN_TICKET,
              configuration: { teamId: '00000000-0000-0000-0000-000000000000' },
              sequenceOrder: 1,
            },
          ],
        },
        {
          name: 'AI Escalation',
          description: 'Triggers AI workflow for ticket analysis and escalation',
          workflowType: WorkflowTypeEnum.AI_WORKFLOW,
          triggers: [{ triggerType: TriggerTypeEnum.AI_ESCALATED, configuration: {} }],
          conditions: [{ field: 'sentiment', operator: 'EQUALS', value: 'NEGATIVE' }],
          actions: [
            {
              actionType: ActionTypeEnum.TRIGGER_AI_WORKFLOW,
              configuration: { prompt: 'Analyze negative sentiment ticket' },
              sequenceOrder: 1,
            },
          ],
        },
      ];

      for (const t of templatesToSeed) {
        const templateId = crypto.randomUUID();
        const triggers = t.triggers.map(
          (trg) =>
            new WorkflowTrigger(crypto.randomUUID(), {
              tenantId,
              workflowId: templateId,
              triggerType: trg.triggerType,
              configuration: trg.configuration,
            }),
        );
        const conditions = t.conditions.map(
          (c) =>
            new WorkflowCondition(crypto.randomUUID(), {
              tenantId,
              workflowId: templateId,
              field: c.field,
              operator: c.operator,
              value: c.value,
            }),
        );
        const actions = t.actions.map(
          (a) =>
            new WorkflowAction(crypto.randomUUID(), {
              tenantId,
              workflowId: templateId,
              actionType: a.actionType,
              configuration: a.configuration,
              sequenceOrder: a.sequenceOrder,
            }),
        );

        const template = WorkflowTemplate.create(templateId, {
          tenantId,
          name: t.name,
          description: t.description,
          workflowType: t.workflowType,
          status: WorkflowStatusEnum.ACTIVE,
          isSystem: true,
          triggers,
          conditions,
          actions,
          variables: {},
        });

        await this.repository.saveTemplate(template, tenantId);
        this.logger.log(`Seeded system template: ${t.name}`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to seed system templates: ${err.message}`);
    }
  }

  public async createTemplate(tenantId: string, dto: CreateTemplateDto): Promise<WorkflowTemplate> {
    const templateId = crypto.randomUUID();
    
    const triggers = (dto.triggers || []).map(
      (t) =>
        new WorkflowTrigger(crypto.randomUUID(), {
          tenantId,
          workflowId: templateId,
          triggerType: t.triggerType,
          configuration: t.configuration,
        }),
    );

    const conditions = (dto.conditions || []).map(
      (c) =>
        new WorkflowCondition(crypto.randomUUID(), {
          tenantId,
          workflowId: templateId,
          field: c.field,
          operator: c.operator,
          value: c.value,
        }),
    );

    const actions = (dto.actions || []).map(
      (a) =>
        new WorkflowAction(crypto.randomUUID(), {
          tenantId,
          workflowId: templateId,
          actionType: a.actionType,
          configuration: a.configuration,
          sequenceOrder: a.sequenceOrder,
        }),
    );

    const template = WorkflowTemplate.create(templateId, {
      tenantId,
      name: dto.name,
      description: dto.description,
      workflowType: dto.workflowType,
      status: dto.status || WorkflowStatusEnum.DRAFT,
      triggers,
      conditions,
      actions,
      variables: dto.variables || {},
    });

    const saved = await this.repository.saveTemplate(template, tenantId);
    await this.eventPublisher.publish(new WorkflowCreatedEvent(tenantId, templateId, template.name));
    return saved;
  }

  public async getTemplate(tenantId: string, id: string): Promise<WorkflowTemplate> {
    const template = await this.repository.getTemplateById(id, tenantId);
    if (!template) {
      throw new NotFoundException(`Workflow template with ID ${id} not found`);
    }
    return template;
  }

  public async findTemplates(tenantId: string, options?: { status?: string; type?: string }): Promise<WorkflowTemplate[]> {
    return this.repository.findTemplates(tenantId, options);
  }

  public async updateTemplate(tenantId: string, id: string, dto: UpdateTemplateDto): Promise<WorkflowTemplate> {
    const template = await this.getTemplate(tenantId, id);

    template.update(dto);

    if (dto.triggers || dto.conditions || dto.actions) {
      const triggers = (dto.triggers || template.triggers.map(t => t.toJSON())).map(
        (t) =>
          new WorkflowTrigger(crypto.randomUUID(), {
            tenantId,
            workflowId: id,
            triggerType: t.triggerType,
            configuration: t.configuration,
          }),
      );

      const conditions = (dto.conditions || template.conditions.map(c => c.toJSON())).map(
        (c) =>
          new WorkflowCondition(crypto.randomUUID(), {
            tenantId,
            workflowId: id,
            field: c.field,
            operator: c.operator,
            value: c.value,
          }),
      );

      const actions = (dto.actions || template.actions.map(a => a.toJSON())).map(
        (a) =>
          new WorkflowAction(crypto.randomUUID(), {
            tenantId,
            workflowId: id,
            actionType: a.actionType,
            configuration: a.configuration,
            sequenceOrder: a.sequenceOrder,
          }),
      );

      template.setDefinition(triggers, conditions, actions);
    }

    if (dto.variables) {
      template.setVariables(dto.variables);
    }

    const saved = await this.repository.saveTemplate(template, tenantId);
    await this.eventPublisher.publish(new WorkflowUpdatedEvent(tenantId, id));
    return saved;
  }

  public async deleteTemplate(tenantId: string, id: string): Promise<boolean> {
    const deleted = await this.repository.deleteTemplate(id, tenantId);
    if (!deleted) {
      throw new NotFoundException(`Workflow template with ID ${id} not found`);
    }
    return deleted;
  }

  public async publishVersion(tenantId: string, id: string): Promise<number> {
    const template = await this.getTemplate(tenantId, id);
    const newVersion = template.publishNewVersion();
    await this.repository.saveTemplate(template, tenantId);

    // Save version in versions table
    await this.repository.saveVersion(
      {
        templateId: id,
        versionNumber: newVersion,
        definition: template.toJSON(),
        isActive: true,
      },
      tenantId,
    );

    return newVersion;
  }

  public async activateTemplate(tenantId: string, id: string): Promise<WorkflowTemplate> {
    const template = await this.getTemplate(tenantId, id);
    template.update({ status: WorkflowStatusEnum.ACTIVE });
    const saved = await this.repository.saveTemplate(template, tenantId);
    await this.eventPublisher.publish(new WorkflowActivatedEvent(tenantId, id));
    return saved;
  }

  public async pauseTemplate(tenantId: string, id: string): Promise<WorkflowTemplate> {
    const template = await this.getTemplate(tenantId, id);
    template.update({ status: WorkflowStatusEnum.PAUSED });
    const saved = await this.repository.saveTemplate(template, tenantId);
    await this.eventPublisher.publish(new WorkflowPausedEvent(tenantId, id));
    return saved;
  }
}
