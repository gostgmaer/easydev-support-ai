import { Entity } from '@easydev/shared-kernel';

export interface ChannelWebhookProps {
  tenantId: string;
  channelId: string;
  webhookUrl: string;
  webhookSecret?: string;
  verificationToken?: string;
  status?: string; // ACTIVE, INACTIVE
  lastReceivedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ChannelWebhook extends Entity<string> {
  private props: ChannelWebhookProps;

  constructor(id: string, props: ChannelWebhookProps) {
    super(id);
    this.props = {
      ...props,
      status: props.status || 'ACTIVE',
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string { return this.props.tenantId; }
  get channelId(): string { return this.props.channelId; }
  get webhookUrl(): string { return this.props.webhookUrl; }
  get webhookSecret(): string | undefined { return this.props.webhookSecret; }
  get verificationToken(): string | undefined { return this.props.verificationToken; }
  get status(): string { return this.props.status || 'ACTIVE'; }
  get lastReceivedAt(): Date | undefined { return this.props.lastReceivedAt; }
  get createdAt(): Date { return this.props.createdAt!; }
  get updatedAt(): Date { return this.props.updatedAt!; }
  get version(): number { return this.props.version || 1; }

  public update(props: Partial<Omit<ChannelWebhookProps, 'tenantId' | 'channelId' | 'createdAt'>>): void {
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
      channelId: this.channelId,
      webhookUrl: this.webhookUrl,
      webhookSecret: this.webhookSecret,
      verificationToken: this.verificationToken,
      status: this.status,
      lastReceivedAt: this.lastReceivedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
