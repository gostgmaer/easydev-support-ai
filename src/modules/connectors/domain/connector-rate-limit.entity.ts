import { Entity } from '@easydev/shared-kernel';

export interface ConnectorRateLimitProps {
  tenantId: string;
  connectorId: string;
  instanceId?: string;
  windowSeconds?: number;
  maxRequests?: number;
  currentUsage?: number;
  resetAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
}

/**
 * Fixed-window rate limit counter for a connector. The window rolls forward
 * automatically once {@link resetAt} has elapsed.
 */
export class ConnectorRateLimit extends Entity<string> {
  private props: ConnectorRateLimitProps;

  constructor(id: string, props: ConnectorRateLimitProps) {
    super(id);
    const windowSeconds = props.windowSeconds || 60;
    this.props = {
      ...props,
      windowSeconds,
      maxRequests: props.maxRequests || 1000,
      currentUsage: props.currentUsage || 0,
      resetAt: props.resetAt || new Date(Date.now() + windowSeconds * 1000),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      version: props.version || 1,
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get connectorId(): string {
    return this.props.connectorId;
  }
  get instanceId(): string | undefined {
    return this.props.instanceId;
  }
  get windowSeconds(): number {
    return this.props.windowSeconds || 60;
  }
  get maxRequests(): number {
    return this.props.maxRequests || 1000;
  }
  get currentUsage(): number {
    return this.props.currentUsage || 0;
  }
  get resetAt(): Date {
    return this.props.resetAt!;
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

  private rollWindowIfNeeded(now: Date): void {
    if (now.getTime() >= this.props.resetAt!.getTime()) {
      this.props.currentUsage = 0;
      this.props.resetAt = new Date(now.getTime() + this.windowSeconds * 1000);
    }
  }

  public isLimited(now: Date = new Date()): boolean {
    this.rollWindowIfNeeded(now);
    return (this.props.currentUsage || 0) >= this.maxRequests;
  }

  public consume(now: Date = new Date()): boolean {
    this.rollWindowIfNeeded(now);
    if ((this.props.currentUsage || 0) >= this.maxRequests) {
      return false;
    }
    this.props.currentUsage = (this.props.currentUsage || 0) + 1;
    this.props.updatedAt = new Date();
    return true;
  }

  public reset(now: Date): void {
    this.props.currentUsage = 0;
    this.props.resetAt = new Date(now.getTime() + this.windowSeconds * 1000);
    this.props.updatedAt = new Date();
  }

  public increment(): void {
    this.props.currentUsage = (this.props.currentUsage || 0) + 1;
    this.props.updatedAt = new Date();
  }

  public updateUsage(currentUsage: number): void {
    this.props.currentUsage = currentUsage;
    this.props.updatedAt = new Date();
  }

  public configure(maxRequests: number, windowSeconds: number): void {
    this.props.maxRequests = maxRequests;
    this.props.windowSeconds = windowSeconds;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      connectorId: this.connectorId,
      instanceId: this.instanceId,
      windowSeconds: this.windowSeconds,
      maxRequests: this.maxRequests,
      currentUsage: this.currentUsage,
      resetAt: this.resetAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
