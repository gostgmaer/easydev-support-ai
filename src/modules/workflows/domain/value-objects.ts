import { ValueObject } from '@easydev/shared-kernel';

export class WorkflowId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WorkflowId {
    if (!value) {
      throw new Error('WorkflowId cannot be empty');
    }
    return new WorkflowId({ value });
  }
}

export class WorkflowExecutionId extends ValueObject<{ value: string }> {
  private constructor(props: { value: string }) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): WorkflowExecutionId {
    if (!value) {
      throw new Error('WorkflowExecutionId cannot be empty');
    }
    return new WorkflowExecutionId({ value });
  }
}

export enum WorkflowTypeEnum {
  TICKET_WORKFLOW = 'TICKET_WORKFLOW',
  CONVERSATION_WORKFLOW = 'CONVERSATION_WORKFLOW',
  ESCALATION_WORKFLOW = 'ESCALATION_WORKFLOW',
  APPROVAL_WORKFLOW = 'APPROVAL_WORKFLOW',
  CUSTOMER_WORKFLOW = 'CUSTOMER_WORKFLOW',
  CONNECTOR_WORKFLOW = 'CONNECTOR_WORKFLOW',
  AI_WORKFLOW = 'AI_WORKFLOW',
  SCHEDULED_WORKFLOW = 'SCHEDULED_WORKFLOW',
  CUSTOM_WORKFLOW = 'CUSTOM_WORKFLOW',
}

export enum WorkflowStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export enum TriggerTypeEnum {
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_UPDATED = 'TICKET_UPDATED',
  TICKET_ESCALATED = 'TICKET_ESCALATED',
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  SLA_BREACHED = 'SLA_BREACHED',
  CONNECTOR_EXECUTED = 'CONNECTOR_EXECUTED',
  AI_ESCALATED = 'AI_ESCALATED',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
}

export enum ActionTypeEnum {
  CREATE_TICKET = 'CREATE_TICKET',
  UPDATE_TICKET = 'UPDATE_TICKET',
  ASSIGN_TICKET = 'ASSIGN_TICKET',
  ESCALATE_TICKET = 'ESCALATE_TICKET',
  SEND_MESSAGE = 'SEND_MESSAGE',
  SEND_EMAIL = 'SEND_EMAIL',
  SEND_NOTIFICATION = 'SEND_NOTIFICATION',
  CALL_CONNECTOR = 'CALL_CONNECTOR',
  TRIGGER_AI_WORKFLOW = 'TRIGGER_AI_WORKFLOW',
  WAIT = 'WAIT',
  APPROVAL = 'APPROVAL',
  UPDATE_CUSTOMER = 'UPDATE_CUSTOMER',
  ADD_TAG = 'ADD_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
  CUSTOM_ACTION = 'CUSTOM_ACTION',
}

export enum ApprovalStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class WorkflowStatus extends ValueObject<{ value: WorkflowStatusEnum }> {
  private constructor(props: { value: WorkflowStatusEnum }) {
    super(props);
  }

  get value(): WorkflowStatusEnum {
    return this.props.value;
  }

  public static create(value: WorkflowStatusEnum): WorkflowStatus {
    return new WorkflowStatus({ value });
  }
}

export class TriggerType extends ValueObject<{ value: TriggerTypeEnum }> {
  private constructor(props: { value: TriggerTypeEnum }) {
    super(props);
  }

  get value(): TriggerTypeEnum {
    return this.props.value;
  }

  public static create(value: TriggerTypeEnum): TriggerType {
    return new TriggerType({ value });
  }
}

export class ActionType extends ValueObject<{ value: ActionTypeEnum }> {
  private constructor(props: { value: ActionTypeEnum }) {
    super(props);
  }

  get value(): ActionTypeEnum {
    return this.props.value;
  }

  public static create(value: ActionTypeEnum): ActionType {
    return new ActionType({ value });
  }
}

export class ApprovalStatus extends ValueObject<{ value: ApprovalStatusEnum }> {
  private constructor(props: { value: ApprovalStatusEnum }) {
    super(props);
  }

  get value(): ApprovalStatusEnum {
    return this.props.value;
  }

  public static create(value: ApprovalStatusEnum): ApprovalStatus {
    return new ApprovalStatus({ value });
  }
}
