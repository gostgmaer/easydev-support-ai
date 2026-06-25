import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Result of an actual authenticated probe against a downstream service -
 * distinct from plain reachability. AUTH_FAILED means the service answered
 * (so it's up) but rejected this app's own credentials (HMAC/API key/token
 * misconfigured or revoked on either side) - a different, more actionable
 * problem than DOWN (network/DNS/service-process failure).
 */
export type AuthProbeResult = {
  status: 'UP' | 'AUTH_FAILED' | 'DOWN';
  error?: string;
};

export abstract class BaseClient {
  protected readonly http: AxiosInstance;
  protected readonly logger: Logger;

  private circuitState: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 5;
  private readonly cooldownPeriodMs = 10000;

  constructor(baseURL: string, clientName: string, timeout = 5000) {
    this.logger = new Logger(clientName);
    this.http = axios.create({ baseURL, timeout });
  }

  protected async request<T = any>(
    config: AxiosRequestConfig,
    retries = 3,
    backoffMs = 500,
  ): Promise<AxiosResponse<T>> {
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownPeriodMs) {
        this.circuitState = 'HALF-OPEN';
        this.logger.warn('Circuit is HALF-OPEN, testing connection...');
      } else {
        this.logger.error('Circuit is OPEN. Fast-failing HTTP request.');
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const response = await this.executeWithRetry<T>(
        config,
        retries,
        backoffMs,
      );

      if (this.circuitState === 'HALF-OPEN') {
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        this.logger.log('Circuit closed successfully.');
      }

      return response;
    } catch (error: any) {
      this.handleFailure(error);
      throw error;
    }
  }

  private async executeWithRetry<T>(
    config: AxiosRequestConfig,
    retries: number,
    backoffMs: number,
  ): Promise<AxiosResponse<T>> {
    try {
      this.logger.debug(
        `Sending Request: ${config.method?.toUpperCase()} ${config.url}`,
      );
      return await this.http.request<T>(config);
    } catch (error: any) {
      const status = error.response?.status;
      const isRetryable = !status || status >= 500;

      if (retries > 0 && isRetryable) {
        this.logger.warn(
          `Request failed. Retrying in ${backoffMs}ms... Attempts left: ${retries}`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.executeWithRetry<T>(config, retries - 1, backoffMs * 2);
      }
      throw error;
    }
  }

  /**
   * Fires a real request with this client's actual auth headers and
   * classifies the result - used by health checks to prove credentials
   * work, not just that the host is reachable. Deliberately bypasses
   * request()'s circuit breaker/retry (a probe shouldn't trip or be
   * tripped by the breaker meant for real traffic) and resolves on every
   * status code rather than throwing, so 401/403 can be distinguished from
   * a 2xx/4xx-business-as-usual response.
   */
  protected async probeAuth(
    config: AxiosRequestConfig,
  ): Promise<AuthProbeResult> {
    try {
      const response = await this.http.request({
        ...config,
        timeout: config.timeout ?? 3000,
        validateStatus: () => true,
      });
      if (response.status === 401 || response.status === 403) {
        return { status: 'AUTH_FAILED', error: `HTTP ${response.status}` };
      }
      if (response.status >= 500) {
        return { status: 'DOWN', error: `HTTP ${response.status}` };
      }
      return { status: 'UP' };
    } catch (e: any) {
      return { status: 'DOWN', error: e.message };
    }
  }

  private handleFailure(error: any) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.logger.error(
      `Request failed (${this.failureCount} consecutive failures): ${error.message}`,
    );

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'OPEN';
      this.logger.error(
        `Circuit opened! Cooldown of ${this.cooldownPeriodMs}ms started.`,
      );
    }
  }
}
