import { OpenTelemetrySetup } from '../otel-setup';
import { MetricsService } from '../metrics.service';
import { LokiLogger } from '../loki-logger';
import { HealthService } from '../health.service';
import * as promClient from 'prom-client';
import { ConsoleLogger } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');

describe('Observability Platform Tests', () => {
  describe('OpenTelemetry Setup', () => {
    it('should start simulated active spans and run callbacks with trace context attributes', async () => {
      const mockContext = {
        tenantId: 'tenant-123',
        correlationId: 'corr-999',
        requestId: 'req-456',
      };

      const result = await OpenTelemetrySetup.startActiveSpan('test-span', mockContext, async (span) => {
        span.setAttribute('custom.attr', 'value');
        span.end();
        return 'span-completed';
      });

      expect(result).toBe('span-completed');
    });
  });

  describe('Metrics Service', () => {
    let metricsService: MetricsService;

    beforeEach(() => {
      promClient.register.clear();
      metricsService = new MetricsService();
    });

    afterEach(() => {
      promClient.register.clear();
    });

    it('should track API requests and observe durations in Prometheus metrics registry', async () => {
      metricsService.recordHttpRequest('tenant-123', 'GET', '/api/users', '200', 0.123);
      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('http_requests_total');
      expect(metricsOutput).toContain('tenant_id="tenant-123"');
      expect(metricsOutput).toContain('method="GET"');
      expect(metricsOutput).toContain('route="/api/users"');
      expect(metricsOutput).toContain('status_code="200"');
    });

    it('should track cache hits and misses', async () => {
      metricsService.recordCacheHit('tenant-1', 'users');
      metricsService.recordCacheMiss('tenant-1', 'users');
      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('cache_hits_total');
      expect(metricsOutput).toContain('cache_misses_total');
    });

    it('should record AI cost and failure metrics', async () => {
      metricsService.recordAiCall('tenant-1', 'gpt-4', 0.05, true);
      metricsService.recordAiCall('tenant-1', 'gpt-4', 0, false, 'rate_limit');
      const metricsOutput = await metricsService.getMetrics();
      expect(metricsOutput).toContain('ai_cost_dollars_total');
      expect(metricsOutput).toContain('ai_failures_total');
    });
  });

  describe('Loki Logger', () => {
    let logger: LokiLogger;

    beforeEach(() => {
      logger = new LokiLogger();
    });

    it('should mask email addresses from console logs', async () => {
      const spy = jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => {});
      await logger.shipLog({
        level: 'info',
        message: 'Send invite to user@example.com for onboarding',
        tenantId: 'tenant-1',
      });
      expect(spy).toHaveBeenCalled();
      const loggedArg = JSON.parse(spy.mock.calls[0][0] as string);
      expect(loggedArg.message).toContain('***@***.***');
      expect(loggedArg.message).not.toContain('user@example.com');
      spy.mockRestore();
    });

    it('should mask sensitive credential keys in logging messages', async () => {
      const spy = jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => {});
      await logger.shipLog({
        level: 'info',
        message: 'Connection configuration settings: apikey="secretkey123" and token=abcxyz123',
        tenantId: 'tenant-1',
      });
      expect(spy).toHaveBeenCalled();
      const loggedArg = JSON.parse(spy.mock.calls[0][0] as string);
      expect(loggedArg.message).toContain('apikey:"[REDACTED]"');
      expect(loggedArg.message).toContain('token:"[REDACTED]"');
      spy.mockRestore();
    });

    it('should mask sensitive values in payload data properties', async () => {
      const spy = jest.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => {});
      await logger.shipLog({
        level: 'info',
        message: 'Processing payload',
        tenantId: 'tenant-1',
        payload: {
          email: 'admin@company.com',
          secret: 'supersecret',
          nested: {
            token: 'top-secret',
          },
        },
      });
      expect(spy).toHaveBeenCalled();
      const loggedArg = JSON.parse(spy.mock.calls[0][0] as string);
      expect(loggedArg.payload.email).toContain('***@***.***');
      expect(loggedArg.payload.secret).toBe('[REDACTED]');
      expect(loggedArg.payload.nested.token).toBe('[REDACTED]');
      spy.mockRestore();
    });
  });

  describe('Health Service', () => {
    let healthService: HealthService;

    beforeEach(() => {
      healthService = new HealthService();
      jest.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: {} });
    });

    it('should execute status query and report platform status', async () => {
      const status = await healthService.checkAiPlatform();
      expect(status.status).toBe('UP');
      expect(status.latencyMs).toBeDefined();
    });

    it('should check local disk capacity details', async () => {
      const status = await healthService.checkStorage();
      expect(status.status).toBe('UP');
      expect(status.freeSpaceGb).toBeGreaterThan(0);
    });
  });
});
