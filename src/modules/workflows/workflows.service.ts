import { Injectable, Logger } from '@nestjs/common';

export interface WorkflowCondition {
  field: string;
  operator: 'EQUALS' | 'CONTAINS' | 'GT' | 'LT';
  value: any;
}

export interface WorkflowAction {
  type: 'NOTIFY_AGENT' | 'CHANGE_STATUS' | 'ASSIGN_TEAM' | 'TRIGGER_CONNECTOR';
  payload: any;
}

export interface WorkflowRule {
  id: string;
  name: string;
  triggerEvent: string; // e.g., 'TICKET_CREATED', 'MESSAGE_RECEIVED'
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
}

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  async executeEvent(tenantId: string, eventName: string, context: any) {
    this.logger.log(
      `Evaluating workflows for event: ${eventName} [Tenant: ${tenantId}]`,
    );

    // MOCK: Fetch rules from DB for this tenant and event
    const activeRules = this.getMockRules(tenantId, eventName);

    for (const rule of activeRules) {
      if (this.evaluateConditions(rule.conditions, context)) {
        this.logger.log(`Rule matched: ${rule.name}. Executing actions...`);
        await this.executeActions(rule.actions, context);
      }
    }
  }

  private evaluateConditions(
    conditions: WorkflowCondition[],
    context: any,
  ): boolean {
    // Simple rule engine evaluation
    for (const cond of conditions) {
      const actualValue = context[cond.field];
      switch (cond.operator) {
        case 'EQUALS':
          if (actualValue !== cond.value) return false;
          break;
        case 'CONTAINS':
          if (!actualValue?.includes(cond.value)) return false;
          break;
      }
    }
    return true; // All conditions met
  }

  private async executeActions(actions: WorkflowAction[], context: any) {
    for (const action of actions) {
      switch (action.type) {
        case 'NOTIFY_AGENT':
          this.logger.log(
            `Action Executed: Notifying agent ${action.payload.agentId}`,
          );
          break;
        case 'ASSIGN_TEAM':
          this.logger.log(
            `Action Executed: Assigning conversation to team ${action.payload.teamId}`,
          );
          break;
      }
    }
  }

  private getMockRules(tenantId: string, eventName: string): WorkflowRule[] {
    if (eventName === 'TICKET_CREATED') {
      return [
        {
          id: 'rule-1',
          name: 'High Priority Escalation',
          triggerEvent: 'TICKET_CREATED',
          conditions: [
            { field: 'priority', operator: 'EQUALS', value: 'HIGH' },
          ],
          actions: [
            { type: 'NOTIFY_AGENT', payload: { agentId: 'manager-123' } },
          ],
        },
      ];
    }
    return [];
  }
}
