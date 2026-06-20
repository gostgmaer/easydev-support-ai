import { Entity } from '@easydev/shared-kernel';

export interface TicketSLAProps {
  tenantId: string;
  ticketId: string;
  policyId?: string;
  responseDueAt?: Date;
  resolutionDueAt?: Date;
  breached: boolean;
  breachedAt?: Date;
  remainingSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SlaBreachType = 'RESPONSE' | 'RESOLUTION';

export class TicketSLA extends Entity<string> {
  private props: TicketSLAProps;

  constructor(id: string, props: TicketSLAProps) {
    super(id);
    this.props = {
      ...props,
      breached: props.breached ?? false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get tenantId(): string {
    return this.props.tenantId;
  }
  get ticketId(): string {
    return this.props.ticketId;
  }
  get policyId(): string | undefined {
    return this.props.policyId;
  }
  get responseDueAt(): Date | undefined {
    return this.props.responseDueAt;
  }
  get resolutionDueAt(): Date | undefined {
    return this.props.resolutionDueAt;
  }
  get breached(): boolean {
    return this.props.breached;
  }
  get breachedAt(): Date | undefined {
    return this.props.breachedAt;
  }
  get remainingSeconds(): number | undefined {
    return this.props.remainingSeconds;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  /**
   * Returns the breach type if the SLA is past due at the given instant and
   * has not already been flagged, otherwise null.
   */
  public detectBreach(
    at: Date,
    responded: boolean,
    resolved: boolean,
  ): SlaBreachType | null {
    if (this.props.breached) return null;
    if (
      !resolved &&
      this.props.resolutionDueAt &&
      this.props.resolutionDueAt.getTime() <= at.getTime()
    ) {
      return 'RESOLUTION';
    }
    if (
      !responded &&
      this.props.responseDueAt &&
      this.props.responseDueAt.getTime() <= at.getTime()
    ) {
      return 'RESPONSE';
    }
    return null;
  }

  public markBreached(at: Date = new Date()): void {
    this.props.breached = true;
    this.props.breachedAt = at;
    this.props.remainingSeconds = 0;
    this.props.updatedAt = new Date();
  }

  public recalculateRemaining(at: Date = new Date()): void {
    if (!this.props.resolutionDueAt) {
      this.props.remainingSeconds = undefined;
      return;
    }
    const remaining = Math.floor(
      (this.props.resolutionDueAt.getTime() - at.getTime()) / 1000,
    );
    this.props.remainingSeconds = remaining;
    this.props.updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      ticketId: this.ticketId,
      policyId: this.policyId,
      responseDueAt: this.responseDueAt,
      resolutionDueAt: this.resolutionDueAt,
      breached: this.breached,
      breachedAt: this.breachedAt,
      remainingSeconds: this.remainingSeconds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
