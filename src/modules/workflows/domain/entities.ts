import { AggregateRoot, Entity } from '@easydev/shared-kernel';
import {
  WorkflowTypeEnum,
  WorkflowStatusEnum,
  TriggerTypeEnum,
  ActionTypeEnum,
  ApprovalStatusEnum,
} from './value-objects';

// ------------------ WorkflowTrigger Entity ------------------
export interface WorkflowTriggerProps {
  tenantId: string;
  workflowId: string;
  triggerType: TriggerTypeEnum;
  configuration?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkflowTrigger extends Entity<string> {
  private props: WorkflowTriggerProps;

  constructor(id: string, props: WorkflowTriggerProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowId(): string {
    return this.props.workflowId;
  }
  get triggerType(): TriggerTypeEnum {
    return this.props.triggerType;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      triggerType: this.triggerType,
      configuration: this.configuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ WorkflowCondition Entity ------------------
export interface WorkflowConditionProps {
  tenantId: string;
  workflowId: string;
  triggerId?: string;
  field: string;
  operator: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkflowCondition extends Entity<string> {
  private props: WorkflowConditionProps;

  constructor(id: string, props: WorkflowConditionProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowId(): string {
    return this.props.workflowId;
  }
  get triggerId(): string | undefined {
    return this.props.triggerId;
  }
  get field(): string {
    return this.props.field;
  }
  get operator(): string {
    return this.props.operator;
  }
  get value(): string {
    return this.props.value;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      triggerId: this.triggerId,
      field: this.field,
      operator: this.operator,
      value: this.value,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ WorkflowAction Entity ------------------
export interface WorkflowActionProps {
  tenantId: string;
  workflowId: string;
  actionType: ActionTypeEnum;
  configuration: Record<string, any>;
  sequenceOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkflowAction extends Entity<string> {
  private props: WorkflowActionProps;

  constructor(id: string, props: WorkflowActionProps) {
    super(id);
    this.props = {
      ...props,
      configuration: props.configuration || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowId(): string {
    return this.props.workflowId;
  }
  get actionType(): ActionTypeEnum {
    return this.props.actionType;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration;
  }
  get sequenceOrder(): number {
    return this.props.sequenceOrder;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      actionType: this.actionType,
      configuration: this.configuration,
      sequenceOrder: this.sequenceOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ WorkflowApproval Entity ------------------
export interface WorkflowApprovalProps {
  tenantId: string;
  workflowExecutionId: string;
  approverId: string;
  approvalStatus: ApprovalStatusEnum;
  comments?: string;
  approvedAt?: Date;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkflowApproval extends Entity<string> {
  private props: WorkflowApprovalProps;

  constructor(id: string, props: WorkflowApprovalProps) {
    super(id);
    this.props = {
      ...props,
      approvalStatus: props.approvalStatus || ApprovalStatusEnum.PENDING,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowExecutionId(): string {
    return this.props.workflowExecutionId;
  }
  get approverId(): string {
    return this.props.approverId;
  }
  get approvalStatus(): ApprovalStatusEnum {
    return this.props.approvalStatus;
  }
  get comments(): string | undefined {
    return this.props.comments;
  }
  get approvedAt(): Date | undefined {
    return this.props.approvedAt;
  }
  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public approve(comments?: string): void {
    this.props.approvalStatus = ApprovalStatusEnum.APPROVED;
    this.props.comments = comments || this.props.comments;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public reject(comments?: string): void {
    this.props.approvalStatus = ApprovalStatusEnum.REJECTED;
    this.props.comments = comments || this.props.comments;
    this.props.approvedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public isExpired(): boolean {
    if (this.props.expiresAt && this.props.expiresAt.getTime() < Date.now()) {
      return true;
    }
    return false;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowExecutionId: this.workflowExecutionId,
      approverId: this.approverId,
      approvalStatus: this.approvalStatus,
      comments: this.comments,
      approvedAt: this.approvedAt,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ WorkflowSchedule Entity ------------------
export interface WorkflowScheduleProps {
  tenantId: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WorkflowSchedule extends Entity<string> {
  private props: WorkflowScheduleProps;

  constructor(id: string, props: WorkflowScheduleProps) {
    super(id);
    this.props = {
      ...props,
      timezone: props.timezone || 'UTC',
      isActive: props.isActive !== undefined ? props.isActive : true,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowId(): string {
    return this.props.workflowId;
  }
  get cronExpression(): string {
    return this.props.cronExpression;
  }
  get timezone(): string {
    return this.props.timezone;
  }
  get nextRunAt(): Date | undefined {
    return this.props.nextRunAt;
  }
  get lastRunAt(): Date | undefined {
    return this.props.lastRunAt;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public updateRun(nextRun: Date): void {
    this.props.lastRunAt = new Date();
    this.props.nextRunAt = nextRun;
    this.props.updatedAt = new Date();
  }

  public toggle(active: boolean): void {
    this.props.isActive = active;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      cronExpression: this.cronExpression,
      timezone: this.timezone,
      nextRunAt: this.nextRunAt,
      lastRunAt: this.lastRunAt,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// ------------------ WorkflowTemplate AggregateRoot ------------------
export interface WorkflowTemplateProps {
  tenantId: string;
  name: string;
  description?: string;
  workflowType: WorkflowTypeEnum;
  status: WorkflowStatusEnum;
  isSystem?: boolean;
  triggers?: WorkflowTrigger[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  variables?: Record<string, { type: string; value: string }>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WorkflowTemplate extends AggregateRoot<string> {
  private props: WorkflowTemplateProps;

  constructor(id: string, props: WorkflowTemplateProps) {
    super(id);
    this.props = {
      ...props,
      isSystem: props.isSystem || false,
      triggers: props.triggers || [],
      conditions: props.conditions || [],
      actions: props.actions || [],
      variables: props.variables || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get workflowType(): WorkflowTypeEnum {
    return this.props.workflowType;
  }
  get status(): WorkflowStatusEnum {
    return this.props.status;
  }
  get isSystem(): boolean {
    return this.props.isSystem || false;
  }
  get triggers(): WorkflowTrigger[] {
    return this.props.triggers || [];
  }
  get conditions(): WorkflowCondition[] {
    return this.props.conditions || [];
  }
  get actions(): WorkflowAction[] {
    return this.props.actions || [];
  }
  get variables(): Record<string, { type: string; value: string }> {
    return this.props.variables || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: Omit<WorkflowTemplateProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): WorkflowTemplate {
    return new WorkflowTemplate(id, props);
  }

  public update(
    props: Partial<
      Pick<WorkflowTemplateProps, 'name' | 'description' | 'status'>
    >,
  ): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
    };
  }

  public setDefinition(
    triggers: WorkflowTrigger[],
    conditions: WorkflowCondition[],
    actions: WorkflowAction[],
  ): void {
    this.props.triggers = triggers;
    this.props.conditions = conditions;
    this.props.actions = actions;
    this.props.updatedAt = new Date();
  }

  public setVariables(
    variables: Record<string, { type: string; value: string }>,
  ): void {
    this.props.variables = variables;
    this.props.updatedAt = new Date();
  }

  public publishNewVersion(): number {
    this.props.version = (this.props.version || 1) + 1;
    this.props.updatedAt = new Date();
    return this.props.version;
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      workflowType: this.workflowType,
      status: this.status,
      isSystem: this.isSystem,
      triggers: this.triggers.map((t) => t.toJSON()),
      conditions: this.conditions.map((c) => c.toJSON()),
      actions: this.actions.map((a) => a.toJSON()),
      variables: this.variables,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ WorkflowExecution AggregateRoot ------------------
export interface WorkflowExecutionProps {
  tenantId: string;
  workflowId: string;
  executionStatus: WorkflowStatusEnum;
  startedAt?: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  triggerSource: string;
  triggerReferenceId?: string;
  context: Record<string, any>;
  result?: Record<string, any>;
  error?: Record<string, any>;
  approvals?: WorkflowApproval[];
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class WorkflowExecution extends AggregateRoot<string> {
  private props: WorkflowExecutionProps;

  constructor(id: string, props: WorkflowExecutionProps) {
    super(id);
    this.props = {
      ...props,
      executionStatus: props.executionStatus || WorkflowStatusEnum.DRAFT,
      startedAt: props.startedAt || new Date(),
      executionTimeMs: props.executionTimeMs || 0,
      context: props.context || {},
      approvals: props.approvals || [],
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get workflowId(): string {
    return this.props.workflowId;
  }
  get executionStatus(): WorkflowStatusEnum {
    return this.props.executionStatus;
  }
  get startedAt(): Date {
    return this.props.startedAt!;
  }
  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }
  get executionTimeMs(): number {
    return this.props.executionTimeMs || 0;
  }
  get triggerSource(): string {
    return this.props.triggerSource;
  }
  get triggerReferenceId(): string | undefined {
    return this.props.triggerReferenceId;
  }
  get context(): Record<string, any> {
    return this.props.context;
  }
  get result(): Record<string, any> | undefined {
    return this.props.result;
  }
  get error(): Record<string, any> | undefined {
    return this.props.error;
  }
  get approvals(): WorkflowApproval[] {
    return this.props.approvals || [];
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get version(): number {
    return this.props.version || 1;
  }

  public static create(
    id: string,
    props: Omit<WorkflowExecutionProps, 'createdAt' | 'updatedAt' | 'version'>,
  ): WorkflowExecution {
    return new WorkflowExecution(id, props);
  }

  public start(): void {
    this.props.executionStatus = WorkflowStatusEnum.ACTIVE;
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public complete(result: Record<string, any> = {}): void {
    this.props.executionStatus = WorkflowStatusEnum.COMPLETED;
    this.props.completedAt = new Date();
    this.props.result = result;
    if (this.props.startedAt) {
      this.props.executionTimeMs = Date.now() - this.props.startedAt.getTime();
    }
    this.props.updatedAt = new Date();
  }

  public fail(error: Record<string, any>): void {
    this.props.executionStatus = WorkflowStatusEnum.FAILED;
    this.props.completedAt = new Date();
    this.props.error = error;
    if (this.props.startedAt) {
      this.props.executionTimeMs = Date.now() - this.props.startedAt.getTime();
    }
    this.props.updatedAt = new Date();
  }

  public pause(): void {
    this.props.executionStatus = WorkflowStatusEnum.PAUSED;
    this.props.updatedAt = new Date();
  }

  public addApproval(approval: WorkflowApproval): void {
    if (!this.props.approvals) {
      this.props.approvals = [];
    }
    this.props.approvals.push(approval);
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      executionStatus: this.executionStatus,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      executionTimeMs: this.executionTimeMs,
      triggerSource: this.triggerSource,
      triggerReferenceId: this.triggerReferenceId,
      context: this.context,
      result: this.result,
      error: this.error,
      approvals: this.approvals.map((a) => a.toJSON()),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
