import { Entity } from '@easydev/shared-kernel';
import { MessageStatusEnum } from './value-objects';

export interface MessageDeliveryStatusProps {
  tenantId: string;
  messageId: string;
  provider?: string;
  providerMessageId?: string;
  status: string;
  attemptCount: number;
  lastAttemptAt?: Date;
  failureReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MessageDeliveryStatus extends Entity<string> {
  private props: MessageDeliveryStatusProps;

  constructor(id: string, props: MessageDeliveryStatusProps) {
    super(id);
    this.props = {
      ...props,
      attemptCount: props.attemptCount ?? 0,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get messageId(): string {
    return this.props.messageId;
  }
  get provider(): string | undefined {
    return this.props.provider;
  }
  get providerMessageId(): string | undefined {
    return this.props.providerMessageId;
  }
  get status(): string {
    return this.props.status;
  }
  get attemptCount(): number {
    return this.props.attemptCount;
  }
  get lastAttemptAt(): Date | undefined {
    return this.props.lastAttemptAt;
  }
  get failureReason(): string | undefined {
    return this.props.failureReason;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public recordAttempt(
    status: MessageStatusEnum | string,
    providerMessageId?: string,
    failureReason?: string,
  ): void {
    this.props.status = status;
    this.props.attemptCount += 1;
    this.props.lastAttemptAt = new Date();
    if (providerMessageId) this.props.providerMessageId = providerMessageId;
    this.props.failureReason = failureReason;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      messageId: this.messageId,
      provider: this.provider,
      providerMessageId: this.providerMessageId,
      status: this.status,
      attemptCount: this.attemptCount,
      lastAttemptAt: this.lastAttemptAt,
      failureReason: this.failureReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
