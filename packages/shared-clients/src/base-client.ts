import { Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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

  protected async request<T = any>(config: AxiosRequestConfig, retries = 3, backoffMs = 500): Promise<AxiosResponse<T>> {
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
      const response = await this.executeWithRetry<T>(config, retries, backoffMs);

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

  private async executeWithRetry<T>(config: AxiosRequestConfig, retries: number, backoffMs: number): Promise<AxiosResponse<T>> {
    try {
      this.logger.debug(`Sending Request: ${config.method?.toUpperCase()} ${config.url}`);
      return await this.http.request<T>(config);
    } catch (error: any) {
      const status = error.response?.status;
      const isRetryable = !status || status >= 500;

      if (retries > 0 && isRetryable) {
        this.logger.warn(`Request failed. Retrying in ${backoffMs}ms... Attempts left: ${retries}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.executeWithRetry<T>(config, retries - 1, backoffMs * 2);
      }
      throw error;
    }
  }

  private handleFailure(error: any) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.logger.error(`Request failed (${this.failureCount} consecutive failures): ${error.message}`);

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'OPEN';
      this.logger.error(`Circuit opened! Cooldown of ${this.cooldownPeriodMs}ms started.`);
    }
  }
}
