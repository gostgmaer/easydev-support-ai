import { Entity } from '@easydev/shared-kernel';

export interface ChannelRateLimitProps {
  tenantId: string;
  channelId: string;
  providerLimit?: number;
  tenantLimit?: number;
  currentUsage?: number;
  resetAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

export class ChannelRateLimit extends Entity<string> {
  private props: ChannelRateLimitProps;

  constructor(id: string, props: ChannelRateLimitProps) {
    super(id);
    this.props = {
      ...props,
      providerLimit: props.providerLimit || 100,
      tenantLimit: props.tenantLimit || 50,
      currentUsage: props.currentUsage || 0,
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
  get providerLimit(): number {
    return this.props.providerLimit || 100;
  }
  get tenantLimit(): number {
    return this.props.tenantLimit || 50;
  }
  get currentUsage(): number {
    return this.props.currentUsage || 0;
  }
  get resetAt(): Date {
    return this.props.resetAt;
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

  public incrementUsage(): void {
    const now = new Date();
    if (now > this.props.resetAt) {
      this.props.currentUsage = 1;
      this.props.resetAt = new Date(now.getTime() + 60000); // 1 minute window
    } else {
      this.props.currentUsage = (this.props.currentUsage || 0) + 1;
    }
    this.props.updatedAt = new Date();
  }

  public isRateLimited(): boolean {
    const now = new Date();
    if (now > this.props.resetAt) {
      return false;
    }
    return (this.props.currentUsage || 0) >= (this.props.tenantLimit || 50);
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      channelId: this.channelId,
      providerLimit: this.providerLimit,
      tenantLimit: this.tenantLimit,
      currentUsage: this.currentUsage,
      resetAt: this.resetAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
