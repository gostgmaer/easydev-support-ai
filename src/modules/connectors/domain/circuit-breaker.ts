export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  openedAt?: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  resetTimeoutMs: number;
}

export const DEFAULT_CIRCUIT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: Number(process.env.CONNECTOR_CB_FAILURE_THRESHOLD || 5),
  successThreshold: Number(process.env.CONNECTOR_CB_SUCCESS_THRESHOLD || 2),
  resetTimeoutMs: Number(process.env.CONNECTOR_CB_RESET_TIMEOUT_MS || 30000),
};

/**
 * Pure circuit-breaker state machine. The breaker trips to OPEN after a number
 * of consecutive failures, refuses calls until the reset timeout elapses, then
 * moves to HALF_OPEN to probe recovery before closing again.
 */
export class CircuitBreaker {
  private state: CircuitState;
  private failureCount: number;
  private successCount: number;
  private openedAt?: number;

  constructor(
    private readonly options: CircuitBreakerOptions = DEFAULT_CIRCUIT_OPTIONS,
    snapshot?: CircuitBreakerSnapshot,
  ) {
    this.state = snapshot?.state ?? CircuitState.CLOSED;
    this.failureCount = snapshot?.failureCount ?? 0;
    this.successCount = snapshot?.successCount ?? 0;
    this.openedAt = snapshot?.openedAt;
  }

  /** Whether a call is permitted right now (transitions OPEN→HALF_OPEN lazily). */
  public canRequest(now: number = Date.now()): boolean {
    if (this.state === CircuitState.OPEN) {
      if (
        this.openedAt !== undefined &&
        now - this.openedAt >= this.options.resetTimeoutMs
      ) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount += 1;
      if (this.successCount >= this.options.successThreshold) {
        this.close();
      }
      return;
    }
    this.failureCount = 0;
  }

  public recordFailure(now: number = Date.now()): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.trip(now);
      return;
    }
    this.failureCount += 1;
    if (this.failureCount >= this.options.failureThreshold) {
      this.trip(now);
    }
  }

  private trip(now: number): void {
    this.state = CircuitState.OPEN;
    this.openedAt = now;
    this.successCount = 0;
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.openedAt = undefined;
  }

  public get currentState(): CircuitState {
    return this.state;
  }

  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  public snapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      openedAt: this.openedAt,
    };
  }
}
