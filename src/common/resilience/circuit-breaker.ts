import { Logger } from '@nestjs/common';

export interface CircuitBreakerOptions {
  failureThreshold: number; // number of failures before opening circuit
  cooldownPeriodMs: number; // time in ms before transitioning from open to half-open
  timeoutMs?: number; // optional timeout for execution
  concurrencyLimit?: number; // bulkhead limit
}

export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN,
}

export class CircuitBreaker {
  private readonly logger = new Logger(CircuitBreaker.name);
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  private activeExecutions = 0;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}

  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: (error: Error) => Promise<T>
  ): Promise<T> {
    // 1. Bulkhead (Concurrency Check)
    if (
      this.options.concurrencyLimit &&
      this.activeExecutions >= this.options.concurrencyLimit
    ) {
      if (fallback) {
        this.logger.warn(`[Bulkhead] Limit reached for ${this.name}. Invoking fallback.`);
        return fallback(new Error(`Bulkhead concurrency limit of ${this.options.concurrencyLimit} reached`));
      }
      throw new Error(`Bulkhead concurrency limit of ${this.options.concurrencyLimit} reached`);
    }

    // 2. Circuit State Check
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      if (fallback) {
        this.logger.warn(`[CircuitBreaker] Circuit is OPEN for ${this.name}. Invoking fallback.`);
        return fallback(new Error(`Circuit is OPEN for ${this.name}`));
      }
      throw new Error(`Circuit is OPEN for ${this.name}`);
    }

    this.activeExecutions++;
    try {
      let resultPromise = fn();
      if (this.options.timeoutMs) {
        resultPromise = Promise.race([
          resultPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout of ${this.options.timeoutMs}ms exceeded`)), this.options.timeoutMs)
          ),
        ]);
      }

      const result = await resultPromise;
      this.onSuccess();
      return result;
    } catch (error: any) {
      this.onFailure();
      if (fallback) {
        this.logger.warn(`[CircuitBreaker] Invoking fallback for ${this.name} due to: ${error.message}`);
        return fallback(error);
      }
      throw error;
    } finally {
      this.activeExecutions--;
    }
  }

  private checkState() {
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastStateChange > this.options.cooldownPeriodMs
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.lastStateChange = Date.now();
      this.logger.log(`[CircuitBreaker] ${this.name} transitioned to HALF-OPEN. Testing service health.`);
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.lastStateChange = Date.now();
      this.logger.log(`[CircuitBreaker] ${this.name} transitioned to CLOSED. Service is healthy.`);
    }
  }

  private onFailure() {
    this.failureCount++;
    this.logger.warn(`[CircuitBreaker] ${this.name} failure count: ${this.failureCount}/${this.options.failureThreshold}`);
    
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      this.logger.error(`[CircuitBreaker] ${this.name} transitioned to OPEN. Fast-failing requests.`);
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = Date.now();
      this.logger.error(`[CircuitBreaker] ${this.name} failed in HALF-OPEN. Re-opening circuit.`);
    }
  }

  public getState(): CircuitState {
    return this.state;
  }
}
