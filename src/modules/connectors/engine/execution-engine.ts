import {
  Injectable,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';
import { CapabilityResolver } from './capability-resolver';
import { ConnectorFactory } from './connector-factory';
import { CredentialManager } from './credential-manager';
import { CircuitBreakerManager } from './circuit-breaker-manager';
import type { IConnectorRepository } from '../repositories/connector-repository.interface';
import { ConnectorExecution } from '../domain/connector-execution.entity';
import { ConnectorRateLimit } from '../domain/connector-rate-limit.entity';
import { ExecutionStatusEnum, AuthTypeEnum } from '../domain/value-objects';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import {
  ConnectorExecutedEvent,
  ConnectorFailedEvent,
  ConnectorRetryEvent,
} from '@easydev/shared-events';
import { ConnectorEventPublisher } from '../services/connector-event.publisher';
import Redis from 'ioredis';

@Injectable()
export class ExecutionEngine {
  private readonly logger = new Logger(ExecutionEngine.name);
  private readonly redis: Redis;
  private isRedisAvailable = false;

  constructor(
    private readonly capabilityResolver: CapabilityResolver,
    private readonly connectorFactory: ConnectorFactory,
    private readonly credentialManager: CredentialManager,
    private readonly cbManager: CircuitBreakerManager,
    @Inject('IConnectorRepository')
    private readonly repository: IConnectorRepository,
    private readonly eventPublisher: ConnectorEventPublisher,
    private readonly queueService: QueueService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => {
      this.isRedisAvailable = false;
    });
    this.redis.on('ready', () => {
      this.isRedisAvailable = true;
    });
    this.redis.connect().catch(() => {
      this.isRedisAvailable = false;
    });
  }

  public async execute(
    tenantId: string,
    capabilityType: any,
    params: Record<string, any>,
    options: {
      workflowId?: string;
      conversationId?: string;
      ticketId?: string;
      idempotencyKey?: string;
      attempt?: number;
    } = {},
  ): Promise<any> {
    const attempt = options.attempt || 1;
    this.logger.log(
      `Executing capability ${capabilityType} for tenant ${tenantId} (Attempt: ${attempt})`,
    );

    // 1. Resolve capability
    const resolved = await this.capabilityResolver.resolve(
      tenantId,
      capabilityType,
    );
    if (!resolved) {
      throw new HttpException(
        `Capability ${capabilityType} is not registered or configured for tenant ${tenantId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { connector, capability } = resolved;

    if (!capability.enabled) {
      throw new HttpException(
        `Capability ${capabilityType} is currently disabled`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Check Circuit Breaker
    const breaker = await this.cbManager.getBreaker(tenantId, connector.id);
    if (!breaker.canRequest()) {
      this.logger.warn(`Circuit breaker is OPEN for connector ${connector.id}`);

      // Save open circuit execution record
      const execution = new ConnectorExecution(crypto.randomUUID(), {
        tenantId,
        connectorId: connector.id,
        capabilityId: capability.id,
        capabilityType: capability.capabilityType.value,
        status: ExecutionStatusEnum.CIRCUIT_OPEN,
        attempt,
        workflowId: options.workflowId,
        conversationId: options.conversationId,
        ticketId: options.ticketId,
        idempotencyKey: options.idempotencyKey,
        startedAt: new Date(),
        completedAt: new Date(),
        error: 'Circuit Breaker Open',
      });
      await this.repository.saveExecution(execution, tenantId);

      throw new HttpException(
        `Circuit breaker is OPEN for connector ${connector.name}. Execution blocked.`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 3. Rate Limiting Check
    const rateLimitExceeded = await this.checkRateLimit(tenantId, connector.id);
    if (rateLimitExceeded) {
      this.logger.warn(`Rate limit exceeded for connector ${connector.id}`);

      const execution = new ConnectorExecution(crypto.randomUUID(), {
        tenantId,
        connectorId: connector.id,
        capabilityId: capability.id,
        capabilityType: capability.capabilityType.value,
        status: ExecutionStatusEnum.FAILED,
        attempt,
        workflowId: options.workflowId,
        conversationId: options.conversationId,
        ticketId: options.ticketId,
        idempotencyKey: options.idempotencyKey,
        startedAt: new Date(),
        completedAt: new Date(),
        error: 'Rate Limit Exceeded',
      });
      await this.repository.saveExecution(execution, tenantId);

      throw new HttpException(
        `Rate limit exceeded for connector ${connector.name}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Retrieve and Decrypt credentials (and refresh OAuth if needed)
    let authConfig = { authType: AuthTypeEnum.NONE, data: null as any };
    if (connector.authType !== AuthTypeEnum.NONE) {
      let credential = await this.repository.getActiveCredential(
        tenantId,
        connector.id,
      );
      if (credential) {
        // Refresh token if expired
        if (
          credential.authType === AuthTypeEnum.OAUTH2 &&
          credential.expiresAt &&
          credential.expiresAt.getTime() < Date.now()
        ) {
          try {
            credential = await this.credentialManager.refreshOAuthToken(
              tenantId,
              credential,
              this.repository,
            );
          } catch (err: any) {
            this.logger.error(`OAuth Refresh failed: ${err.message}`);
          }
        }
        authConfig = {
          authType: credential.authType as AuthTypeEnum,
          data: this.credentialManager.decrypt(credential.encryptedData),
        };
      }
    }

    // 5. Build Request
    const { config, url } = this.connectorFactory.prepareRequest(
      connector.connectorType.value as any,
      connector.baseUrl || '',
      capability.method,
      capability.path,
      params,
      authConfig,
      connector.config,
    );

    // 6. Record Initial Execution Status
    const executionId = crypto.randomUUID();
    const execution = new ConnectorExecution(executionId, {
      tenantId,
      connectorId: connector.id,
      capabilityId: capability.id,
      capabilityType: capability.capabilityType.value,
      status: ExecutionStatusEnum.RUNNING,
      attempt,
      requestPayload: config.data || config.params || {},
      workflowId: options.workflowId,
      conversationId: options.conversationId,
      ticketId: options.ticketId,
      idempotencyKey: options.idempotencyKey,
      startedAt: new Date(),
    });
    await this.repository.saveExecution(execution, tenantId);
    await this.repository.addLog(tenantId, {
      connectorId: connector.id,
      executionId,
      level: 'INFO',
      message: `Started connector execution. Method: ${config.method}, URL: ${url}`,
    });

    const startTime = Date.now();

    try {
      // 7. Make call
      const response = await axios(config);
      const latencyMs = Date.now() - startTime;

      // Update success
      execution.markSuccess(response.status, response.data, latencyMs);
      await this.repository.saveExecution(execution, tenantId);

      // Update Circuit Breaker
      breaker.recordSuccess();
      await this.cbManager.saveBreaker(tenantId, connector.id, breaker);

      // Log success
      await this.repository.addLog(tenantId, {
        connectorId: connector.id,
        executionId,
        level: 'INFO',
        message: `Connector executed successfully in ${latencyMs}ms. Status: ${response.status}`,
      });

      // Fire Events
      await this.eventPublisher.publish(
        new ConnectorExecutedEvent(
          tenantId,
          connector.id,
          capability.name,
          response.status,
          latencyMs,
        ),
      );

      return response.data;
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const statusCode = error.response?.status || 500;
      const errorMsg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;

      // Update failure
      execution.markFailed(errorMsg, latencyMs, statusCode);
      await this.repository.saveExecution(execution, tenantId);

      // Update Circuit Breaker
      breaker.recordFailure();
      await this.cbManager.saveBreaker(tenantId, connector.id, breaker);

      // Log failure
      await this.repository.addLog(tenantId, {
        connectorId: connector.id,
        executionId,
        level: 'ERROR',
        message: `Connector execution failed in ${latencyMs}ms: ${errorMsg}`,
        context: { statusCode },
      });

      // Check for retries
      const maxRetries = connector.config?.maxRetries ?? 3;
      if (attempt < maxRetries) {
        execution.markRetrying();
        await this.repository.saveExecution(execution, tenantId);

        // Publish retry event
        await this.eventPublisher.publish(
          new ConnectorRetryEvent(
            tenantId,
            connector.id,
            executionId,
            attempt + 1,
          ),
        );

        // Schedule retry job
        await this.queueService.addJob(
          QUEUES.CONNECTOR,
          'connector-retry-job',
          {
            tenantId,
            capabilityType,
            params,
            options: {
              ...options,
              attempt: attempt + 1,
            },
          },
          {
            delay: Math.pow(2, attempt) * 1000, // Exponential backoff e.g. 2s, 4s, 8s
          },
        );

        this.logger.log(
          `Scheduled retry attempt ${attempt + 1} for execution ${executionId}`,
        );
      } else {
        // Publish failure event if all retries exhausted
        await this.eventPublisher.publish(
          new ConnectorFailedEvent(
            tenantId,
            connector.id,
            capability.name,
            errorMsg,
          ),
        );
      }

      throw new HttpException(
        `Connector invocation failed: ${errorMsg}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private async checkRateLimit(
    tenantId: string,
    connectorId: string,
  ): Promise<boolean> {
    const key = `connector:rate:${tenantId}:${connectorId}`;
    const limit = await this.repository.getRateLimit(tenantId, connectorId);

    if (!limit) {
      return false; // No limit configured
    }

    const { maxRequests, windowSeconds } = limit;

    if (this.isRedisAvailable) {
      try {
        const count = await this.redis.eval(
          `
          local current = redis.call('get', KEYS[1])
          if current then
            if tonumber(current) >= tonumber(ARGV[1]) then
              return tonumber(current)
            else
              redis.call('incr', KEYS[1])
              return tonumber(current) + 1
            end
          else
            redis.call('set', KEYS[1], 1, 'EX', tonumber(ARGV[2]))
            return 1
          end
          `,
          1,
          key,
          maxRequests,
          windowSeconds,
        );

        const currentUsage = Number(count);
        // Sync rate limit usage in DB (best effort, async)
        if (currentUsage % 10 === 0 || currentUsage >= maxRequests) {
          await this.syncRateLimitUsage(tenantId, limit, currentUsage);
        }

        return currentUsage > maxRequests;
      } catch (err: any) {
        this.logger.debug(
          `Redis rate limit script error: ${err.message}. Degrading to DB.`,
        );
      }
    }

    // DB/Memory fallback
    const now = new Date();
    const allowed = limit.consume(now);
    if (!allowed) {
      return true;
    }

    await this.repository.upsertRateLimit(limit, tenantId);
    return false;
  }

  private async syncRateLimitUsage(
    tenantId: string,
    limit: ConnectorRateLimit,
    currentUsage: number,
  ): Promise<void> {
    try {
      limit.updateUsage(currentUsage);
      await this.repository.upsertRateLimit(limit, tenantId);
    } catch (err: any) {
      this.logger.debug(`Failed to sync rate limit in DB: ${err.message}`);
    }
  }
}
