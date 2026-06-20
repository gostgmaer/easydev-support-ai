import { Entity } from '@easydev/shared-kernel';
import { AssignmentStrategyEnum } from './value-objects';

export interface AssignmentRuleProps {
  tenantId: string;
  teamId: string;
  ruleType: AssignmentStrategyEnum;
  priority: number;
  configuration?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AssignmentRule extends Entity<string> {
  private props: AssignmentRuleProps;

  constructor(id: string, props: AssignmentRuleProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get teamId(): string { return this.props.teamId; }
  get ruleType(): AssignmentStrategyEnum { return this.props.ruleType; }
  get priority(): number { return this.props.priority; }
  get configuration(): Record<string, any> { return this.props.configuration || {}; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }

  public update(props: Partial<Omit<AssignmentRuleProps, 'tenantId' | 'teamId' | 'ruleType' | 'createdAt'>>): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      teamId: this.teamId,
      ruleType: this.ruleType,
      priority: this.priority,
      configuration: this.configuration,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
