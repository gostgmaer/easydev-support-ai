import { AggregateRoot } from '@easydev/shared-kernel';
import { ChannelType, ChannelStatus, ChannelProvider } from './value-objects';
import { ChannelConfiguration } from './channel-configuration.entity';
import { ChannelWebhook } from './channel-webhook.entity';
import { ChannelTemplate } from './channel-template.entity';
import { ChannelRateLimit } from './channel-rate-limit.entity';
import {
  ChannelCreatedEvent,
  ChannelUpdatedEvent,
  ChannelDisabledEvent,
  ChannelEnabledEvent,
} from '@easydev/shared-events';

export interface ChannelProps {
  tenantId: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  provider: ChannelProvider;
  isActive: boolean;
  isDefault: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  version?: number;
  configuration?: ChannelConfiguration;
  webhook?: ChannelWebhook;
  templates?: ChannelTemplate[];
  rateLimit?: ChannelRateLimit;
}

export class Channel extends AggregateRoot<string> {
  private props: ChannelProps;

  constructor(id: string, props: ChannelProps) {
    super(id);
    this.props = {
      ...props,
      isActive: props.isActive ?? true,
      isDefault: props.isDefault ?? false,
      metadata: props.metadata || {},
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
      templates: props.templates || [],
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get name(): string {
    return this.props.name;
  }
  get type(): ChannelType {
    return this.props.type;
  }
  get status(): ChannelStatus {
    return this.props.status;
  }
  get provider(): ChannelProvider {
    return this.props.provider;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get isDefault(): boolean {
    return this.props.isDefault;
  }
  get metadata(): Record<string, any> {
    return this.props.metadata || {};
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }
  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }
  get version(): number {
    return this.props.version!;
  }

  get configuration(): ChannelConfiguration | undefined {
    return this.props.configuration;
  }
  get webhook(): ChannelWebhook | undefined {
    return this.props.webhook;
  }
  get templates(): ChannelTemplate[] {
    return this.props.templates || [];
  }
  get rateLimit(): ChannelRateLimit | undefined {
    return this.props.rateLimit;
  }

  public static create(
    id: string,
    props: Omit<
      ChannelProps,
      'createdAt' | 'updatedAt' | 'version' | 'templates'
    >,
  ): Channel {
    const channel = new Channel(id, props);
    channel.addDomainEvent(
      new ChannelCreatedEvent(
        channel.tenantId,
        channel.id,
        channel.name,
        channel.type.value,
      ),
    );
    return channel;
  }

  public update(
    props: Partial<Pick<ChannelProps, 'name' | 'metadata' | 'isDefault'>>,
  ): void {
    this.props = {
      ...this.props,
      ...props,
      updatedAt: new Date(),
      version: this.props.version! + 1,
    };
    this.addDomainEvent(
      new ChannelUpdatedEvent(this.tenantId, this.id, this.name),
    );
  }

  public enable(): void {
    if (!this.props.isActive) {
      this.props.isActive = true;
      this.props.updatedAt = new Date();
      this.props.version = this.props.version! + 1;
      this.addDomainEvent(new ChannelEnabledEvent(this.tenantId, this.id));
    }
  }

  public disable(): void {
    if (this.props.isActive) {
      this.props.isActive = false;
      this.props.updatedAt = new Date();
      this.props.version = this.props.version! + 1;
      this.addDomainEvent(new ChannelDisabledEvent(this.tenantId, this.id));
    }
  }

  public setConfiguration(config: ChannelConfiguration): void {
    this.props.configuration = config;
    this.props.updatedAt = new Date();
  }

  public setWebhook(webhook: ChannelWebhook): void {
    this.props.webhook = webhook;
    this.props.updatedAt = new Date();
  }

  public addTemplate(template: ChannelTemplate): void {
    const exists = this.templates.some(
      (t) => t.templateName === template.templateName,
    );
    if (!exists) {
      this.templates.push(template);
      this.props.updatedAt = new Date();
    }
  }

  public removeTemplate(templateName: string): void {
    const index = this.templates.findIndex(
      (t) => t.templateName === templateName,
    );
    if (index !== -1) {
      this.templates.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  public setRateLimit(rateLimit: ChannelRateLimit): void {
    this.props.rateLimit = rateLimit;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      type: this.type.value,
      status: this.status.value,
      provider: this.provider.value,
      isActive: this.isActive,
      isDefault: this.isDefault,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
      configuration: this.configuration?.toJSON(),
      webhook: this.webhook?.toJSON(),
      templates: this.templates.map((t) => t.toJSON()),
      rateLimit: this.rateLimit?.toJSON(),
    };
  }
}
