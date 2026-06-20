import { Entity } from '@easydev/shared-kernel';
import {
  SessionStateEnum,
  WorkflowStatusEnum,
  ToolStatusEnum,
  EscalationStatusEnum,
  EscalationTargetEnum,
} from './value-objects';

// ------------------ AiConversationSession ------------------
export interface AiConversationSessionProps {
  tenantId: string;
  conversationId: string;
  customerId: string;
  agentId: string;
  workflowExecutionId?: string;
  sessionState: Record<string, any>;
  lastInteractionAt?: Date;
  contextVersion?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiConversationSession extends Entity<string> {
  private props: AiConversationSessionProps;

  constructor(id: string, props: AiConversationSessionProps) {
    super(id);
    this.props = {
      ...props,
      sessionState: props.sessionState || { status: SessionStateEnum.ACTIVE },
      contextVersion: props.contextVersion || 1,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get conversationId(): string { return this.props.conversationId; }
  get customerId(): string { return this.props.customerId; }
  get agentId(): string { return this.props.agentId; }
  get workflowExecutionId(): string | undefined { return this.props.workflowExecutionId; }
  get sessionState(): Record<string, any> { return this.props.sessionState; }
  get lastInteractionAt(): Date | undefined { return this.props.lastInteractionAt; }
  get contextVersion(): number { return this.props.contextVersion || 1; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public updateState(state: Record<string, any>): void {
    this.props.sessionState = {
      ...this.props.sessionState,
      ...state,
    };
    this.props.lastInteractionAt = new Date();
    this.props.contextVersion = (this.props.contextVersion || 1) + 1;
    this.props.updatedAt = new Date();
  }

  public associateWorkflow(executionId: string): void {
    this.props.workflowExecutionId = executionId;
    this.props.lastInteractionAt = new Date();
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      customerId: this.customerId,
      agentId: this.agentId,
      workflowExecutionId: this.workflowExecutionId,
      sessionState: this.sessionState,
      lastInteractionAt: this.lastInteractionAt,
      contextVersion: this.contextVersion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ AiWorkflowExecution ------------------
export interface AiWorkflowExecutionProps {
  tenantId: string;
  workflowId: string;
  conversationId: string;
  status: WorkflowStatusEnum;
  startedAt?: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  tokensUsed?: number;
  estimatedCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiWorkflowExecution extends Entity<string> {
  private props: AiWorkflowExecutionProps;

  constructor(id: string, props: AiWorkflowExecutionProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || WorkflowStatusEnum.PENDING,
      startedAt: props.startedAt || new Date(),
      executionTimeMs: props.executionTimeMs || 0,
      tokensUsed: props.tokensUsed || 0,
      estimatedCost: props.estimatedCost || 0.0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get workflowId(): string { return this.props.workflowId; }
  get conversationId(): string { return this.props.conversationId; }
  get status(): WorkflowStatusEnum { return this.props.status; }
  get startedAt(): Date { return this.props.startedAt!; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get executionTimeMs(): number { return this.props.executionTimeMs || 0; }
  get tokensUsed(): number { return this.props.tokensUsed || 0; }
  get estimatedCost(): number { return this.props.estimatedCost || 0.0; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public start(): void {
    this.props.status = WorkflowStatusEnum.RUNNING;
    this.props.startedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public complete(tokensUsed: number, estimatedCost: number): void {
    this.props.status = WorkflowStatusEnum.COMPLETED;
    this.props.completedAt = new Date();
    this.props.tokensUsed = tokensUsed;
    this.props.estimatedCost = estimatedCost;
    if (this.props.startedAt) {
      this.props.executionTimeMs = Date.now() - this.props.startedAt.getTime();
    }
    this.props.updatedAt = new Date();
  }

  public fail(reason: string): void {
    this.props.status = WorkflowStatusEnum.FAILED;
    this.props.completedAt = new Date();
    if (this.props.startedAt) {
      this.props.executionTimeMs = Date.now() - this.props.startedAt.getTime();
    }
    this.props.updatedAt = new Date();
  }

  public timeout(): void {
    this.props.status = WorkflowStatusEnum.TIMEOUT;
    this.props.completedAt = new Date();
    if (this.props.startedAt) {
      this.props.executionTimeMs = Date.now() - this.props.startedAt.getTime();
    }
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowId: this.workflowId,
      conversationId: this.conversationId,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      executionTimeMs: this.executionTimeMs,
      tokensUsed: this.tokensUsed,
      estimatedCost: this.estimatedCost,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ AiToolRequest ------------------
export interface AiToolRequestProps {
  tenantId: string;
  workflowExecutionId: string;
  toolName: string;
  capability: string;
  payload: Record<string, any>;
  status: ToolStatusEnum;
  requestedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiToolRequest extends Entity<string> {
  private props: AiToolRequestProps;

  constructor(id: string, props: AiToolRequestProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || ToolStatusEnum.PENDING,
      requestedAt: props.requestedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get workflowExecutionId(): string { return this.props.workflowExecutionId; }
  get toolName(): string { return this.props.toolName; }
  get capability(): string { return this.props.capability; }
  get payload(): Record<string, any> { return this.props.payload; }
  get status(): ToolStatusEnum { return this.props.status; }
  get requestedAt(): Date { return this.props.requestedAt!; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public complete(): void {
    this.props.status = ToolStatusEnum.SUCCESS;
    this.props.updatedAt = new Date();
  }

  public fail(): void {
    this.props.status = ToolStatusEnum.FAILED;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      workflowExecutionId: this.workflowExecutionId,
      toolName: this.toolName,
      capability: this.capability,
      payload: this.payload,
      status: this.status,
      requestedAt: this.requestedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ AiToolResult ------------------
export interface AiToolResultProps {
  tenantId: string;
  toolRequestId: string;
  response: Record<string, any>;
  status: ToolStatusEnum;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiToolResult extends Entity<string> {
  private props: AiToolResultProps;

  constructor(id: string, props: AiToolResultProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || ToolStatusEnum.SUCCESS,
      completedAt: props.completedAt || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get toolRequestId(): string { return this.props.toolRequestId; }
  get response(): Record<string, any> { return this.props.response; }
  get status(): ToolStatusEnum { return this.props.status; }
  get completedAt(): Date { return this.props.completedAt!; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      toolRequestId: this.toolRequestId,
      response: this.response,
      status: this.status,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ AiEscalation ------------------
export interface AiEscalationProps {
  tenantId: string;
  conversationId: string;
  reason: string;
  confidenceScore?: number;
  sentimentScore?: number;
  escalatedTo: EscalationTargetEnum;
  status: EscalationStatusEnum;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiEscalation extends Entity<string> {
  private props: AiEscalationProps;

  constructor(id: string, props: AiEscalationProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || EscalationStatusEnum.PENDING,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get conversationId(): string { return this.props.conversationId; }
  get reason(): string { return this.props.reason; }
  get confidenceScore(): number | undefined { return this.props.confidenceScore; }
  get sentimentScore(): number | undefined { return this.props.sentimentScore; }
  get escalatedTo(): EscalationTargetEnum { return this.props.escalatedTo; }
  get status(): EscalationStatusEnum { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public resolve(): void {
    this.props.status = EscalationStatusEnum.RESOLVED;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      conversationId: this.conversationId,
      reason: this.reason,
      confidenceScore: this.confidenceScore,
      sentimentScore: this.sentimentScore,
      escalatedTo: this.escalatedTo,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ------------------ AiUsageMetric ------------------
export interface AiUsageMetricProps {
  tenantId: string;
  agentId: string;
  date: string; // YYYY-MM-DD
  requests: number;
  tokens: number;
  cost: number;
  workflowCount: number;
  toolCalls: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class AiUsageMetric extends Entity<string> {
  private props: AiUsageMetricProps;

  constructor(id: string, props: AiUsageMetricProps) {
    super(id);
    this.props = {
      ...props,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get agentId(): string { return this.props.agentId; }
  get date(): string { return this.props.date; }
  get requests(): number { return this.props.requests; }
  get tokens(): number { return this.props.tokens; }
  get cost(): number { return this.props.cost; }
  get workflowCount(): number { return this.props.workflowCount; }
  get toolCalls(): number { return this.props.toolCalls; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public recordRequest(tokens: number, cost: number, workflowInc: boolean, toolsCount: number): void {
    this.props.requests = (this.props.requests || 0) + 1;
    this.props.tokens = (this.props.tokens || 0) + tokens;
    this.props.cost = (this.props.cost || 0.0) + cost;
    if (workflowInc) {
      this.props.workflowCount = (this.props.workflowCount || 0) + 1;
    }
    this.props.toolCalls = (this.props.toolCalls || 0) + toolsCount;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      agentId: this.agentId,
      date: this.date,
      requests: this.requests,
      tokens: this.tokens,
      cost: this.cost,
      workflowCount: this.workflowCount,
      toolCalls: this.toolCalls,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
