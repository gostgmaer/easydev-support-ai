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
  /** Timestamp when the SLA clock was most recently paused (null = running). */
  pausedAt?: Date;
  /** Total cumulative seconds the clock has been paused across all pause windows. */
  pausedSeconds: number;
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
      pausedSeconds: props.pausedSeconds ?? 0,
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
  get pausedAt(): Date | undefined {
    return this.props.pausedAt;
  }
  get pausedSeconds(): number {
    return this.props.pausedSeconds;
  }
  get isPaused(): boolean {
    return !!this.props.pausedAt;
  }
  get createdAt(): Date {
    return this.props.createdAt!;
  }
  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  /**
   * Pauses the SLA clock. Records the instant the clock stopped so that
   * resume() can shift the deadlines forward by the elapsed pause window.
   * No-op if already paused or breached.
   */
  public pause(at: Date = new Date()): void {
    if (this.props.breached || this.props.pausedAt) return;
    this.props.pausedAt = at;
    this.props.updatedAt = new Date();
  }

  /**
   * Resumes the SLA clock by shifting both deadlines forward by the duration
   * of the most recent pause window. Accumulates the elapsed pause time so
   * the total can be reported alongside the SLA record.
   */
  public resume(at: Date = new Date()): void {
    if (!this.props.pausedAt) return;
    const elapsedMs = at.getTime() - this.props.pausedAt.getTime();
    const elapsedSecs = Math.round(elapsedMs / 1000);

    if (this.props.responseDueAt) {
      this.props.responseDueAt = new Date(
        this.props.responseDueAt.getTime() + elapsedMs,
      );
    }
    if (this.props.resolutionDueAt) {
      this.props.resolutionDueAt = new Date(
        this.props.resolutionDueAt.getTime() + elapsedMs,
      );
    }

    this.props.pausedSeconds += elapsedSecs;
    this.props.pausedAt = undefined;
    this.props.updatedAt = new Date();
  }

  /**
   * Returns the breach type if the SLA is past due at the given instant and
   * has not already been flagged, otherwise null.
   * Paused SLAs are never swept — the deadlines shift on resume.
   */
  public detectBreach(
    at: Date,
    responded: boolean,
    resolved: boolean,
  ): SlaBreachType | null {
    if (this.props.breached) return null;
    // Do not flag a breach while the clock is paused
    if (this.props.pausedAt) return null;
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
    // While paused the remaining time doesn't change
    if (this.props.pausedAt) return;
    if (!this.props.resolutionDueAt) {
      this.props.remainingSeconds = undefined;
      return;
    }
    const remaining = Math.floor(
      (this.props.resolutionDueAt.getTime() - at.getTime()) / 1000,
    );
    this.props.remainingSeconds = Math.max(0, remaining);
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
      pausedAt: this.pausedAt,
      pausedSeconds: this.pausedSeconds,
      isPaused: this.isPaused,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
