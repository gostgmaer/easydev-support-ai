import { Entity } from '@easydev/shared-kernel';
import { WebhookStatus, WebhookStatusEnum } from './value-objects';

export interface WebhookRetryPolicy {
  maxAttempts: number;
  backoffMs: number;
}

export interface WebhookProps {
  tenantId: string;
  name: string;
  url: string;
  secretEncrypted: string;
  events: string[];
  status: WebhookStatus;
  retryPolicy?: WebhookRetryPolicy;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: string;
  consecutiveFailures?: number;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

const DEFAULT_RETRY_POLICY: WebhookRetryPolicy = {
  maxAttempts: 5,
  backoffMs: 5000,
};

const FAILING_THRESHOLD = 3;

export class Webhook extends Entity<string> {
  private props: WebhookProps;

  constructor(id: string, props: WebhookProps) {
    super(id);
    this.props = {
      ...props,
      retryPolicy: props.retryPolicy || DEFAULT_RETRY_POLICY,
      consecutiveFailures: props.consecutiveFailures ?? 0,
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
  get url(): string {
    return this.props.url;
  }
  get secretEncrypted(): string {
    return this.props.secretEncrypted;
  }
  get events(): string[] {
    return this.props.events;
  }
  get status(): WebhookStatus {
    return this.props.status;
  }
  get retryPolicy(): WebhookRetryPolicy {
    return this.props.retryPolicy || DEFAULT_RETRY_POLICY;
  }
  get lastDeliveryAt(): Date | undefined {
    return this.props.lastDeliveryAt;
  }
  get lastDeliveryStatus(): string | undefined {
    return this.props.lastDeliveryStatus;
  }
  get consecutiveFailures(): number {
    return this.props.consecutiveFailures ?? 0;
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
    props: {
      tenantId: string;
      name: string;
      url: string;
      secretEncrypted: string;
      events: string[];
      retryPolicy?: WebhookRetryPolicy;
    },
  ): Webhook {
    return new Webhook(id, {
      ...props,
      status: WebhookStatus.create(WebhookStatusEnum.ACTIVE),
    });
  }

  public update(props: {
    name?: string;
    url?: string;
    events?: string[];
    retryPolicy?: WebhookRetryPolicy;
  }): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.url !== undefined) this.props.url = props.url;
    if (props.events !== undefined) this.props.events = props.events;
    if (props.retryPolicy !== undefined) this.props.retryPolicy = props.retryPolicy;
    this.props.updatedAt = new Date();
  }

  public rotateSecret(secretEncrypted: string): void {
    this.props.secretEncrypted = secretEncrypted;
    this.props.updatedAt = new Date();
  }

  public disable(): void {
    this.props.status = WebhookStatus.create(WebhookStatusEnum.DISABLED);
    this.props.updatedAt = new Date();
  }

  public enable(): void {
    this.props.status = WebhookStatus.create(WebhookStatusEnum.ACTIVE);
    this.props.consecutiveFailures = 0;
    this.props.updatedAt = new Date();
  }

  public recordDeliverySuccess(at: Date = new Date()): void {
    this.props.lastDeliveryAt = at;
    this.props.lastDeliveryStatus = 'SUCCESS';
    this.props.consecutiveFailures = 0;
    if (this.props.status.value === WebhookStatusEnum.FAILING) {
      this.props.status = WebhookStatus.create(WebhookStatusEnum.ACTIVE);
    }
    this.props.updatedAt = new Date();
  }

  public recordDeliveryFailure(at: Date = new Date()): void {
    this.props.lastDeliveryAt = at;
    this.props.lastDeliveryStatus = 'FAILED';
    this.props.consecutiveFailures = (this.props.consecutiveFailures ?? 0) + 1;
    if (
      this.props.consecutiveFailures >= FAILING_THRESHOLD &&
      this.props.status.value === WebhookStatusEnum.ACTIVE
    ) {
      this.props.status = WebhookStatus.create(WebhookStatusEnum.FAILING);
    }
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      url: this.url,
      events: this.events,
      status: this.status.value,
      retryPolicy: this.retryPolicy,
      lastDeliveryAt: this.lastDeliveryAt,
      lastDeliveryStatus: this.lastDeliveryStatus,
      consecutiveFailures: this.consecutiveFailures,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
