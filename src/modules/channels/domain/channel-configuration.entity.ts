import { Entity } from '@easydev/shared-kernel';

export interface ChannelConfigurationProps {
  tenantId: string;
  channelId: string;
  authenticationType: string; // API_KEY, OAUTH2, BASIC
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
  healthStatus?: string; // ONLINE, OFFLINE, DEGRADED, UNKNOWN
  lastHealthCheck?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ChannelConfiguration extends Entity<string> {
  private props: ChannelConfigurationProps;

  constructor(id: string, props: ChannelConfigurationProps) {
    super(id);
    this.props = {
      ...props,
      settings: props.settings || {},
      healthStatus: props.healthStatus || 'UNKNOWN',
      lastHealthCheck: props.lastHealthCheck || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get channelId(): string {
    return this.props.channelId;
  }
  get authenticationType(): string {
    return this.props.authenticationType;
  }
  get configuration(): Record<string, any> {
    return this.props.configuration;
  }
  get credentials(): Record<string, any> {
    return this.props.credentials;
  }
  get settings(): Record<string, any> {
    return this.props.settings || {};
  }
  get healthStatus(): string {
    return this.props.healthStatus || 'UNKNOWN';
  }
  get lastHealthCheck(): Date {
    return this.props.lastHealthCheck!;
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

  public update(
    props: Partial<
      Omit<ChannelConfigurationProps, 'tenantId' | 'channelId' | 'createdAt'>
    >,
  ): void {
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
      authenticationType: this.authenticationType,
      configuration: this.configuration,
      credentials: this.credentials,
      settings: this.settings,
      healthStatus: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
