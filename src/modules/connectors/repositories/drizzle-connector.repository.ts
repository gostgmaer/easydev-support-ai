import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import {
  eq,
  and,
  or,
  ilike,
  sql,
  desc,
  asc,
  gt,
  lte,
  isNull,
} from 'drizzle-orm';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { ConnectorInstance } from '../domain/connector-instance.entity';
import { ConnectorCredential } from '../domain/connector-credential.entity';
import { ConnectorExecution } from '../domain/connector-execution.entity';
import { ConnectorWebhook } from '../domain/connector-webhook.entity';
import { ConnectorRateLimit } from '../domain/connector-rate-limit.entity';
import { ConnectorStatusEnum } from '../domain/value-objects';
import {
  IConnectorRepository,
  ConnectorQueryOptions,
  ExecutionQueryOptions,
  ConnectorLogInput,
  PaginatedResult,
} from './connector-repository.interface';
import { ConnectorMapper } from './connector.mapper';

@Injectable()
export class DrizzleConnectorRepository implements IConnectorRepository {
  private async loadCapabilities(connectorId: string, tenantId: string) {
    return db
      .select()
      .from(schema.connectorCapabilities)
      .where(
        and(
          eq(schema.connectorCapabilities.connectorId, connectorId),
          eq(schema.connectorCapabilities.tenantId, tenantId),
        ),
      )
      .orderBy(asc(schema.connectorCapabilities.createdAt));
  }

  async findById(id: string, tenantId: string): Promise<Connector | null> {
    const [row] = await db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.id, id),
          eq(schema.connectors.tenantId, tenantId),
        ),
      );
    if (!row) return null;
    const capabilities = await this.loadCapabilities(id, tenantId);
    return ConnectorMapper.toDomain(row, capabilities);
  }

  async findAll(tenantId: string): Promise<Connector[]> {
    const rows = await db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.tenantId, tenantId),
          isNull(schema.connectors.deletedAt),
        ),
      );
    return rows.map((r) => ConnectorMapper.toDomain(r));
  }

  async findBySlug(tenantId: string, slug: string): Promise<Connector | null> {
    const [row] = await db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.tenantId, tenantId),
          eq(schema.connectors.slug, slug),
        ),
      );
    if (!row) return null;
    const capabilities = await this.loadCapabilities(row.id, tenantId);
    return ConnectorMapper.toDomain(row, capabilities);
  }

  async save(connector: Connector, tenantId: string): Promise<Connector> {
    const raw = {
      id: connector.id,
      tenantId: connector.tenantId,
      name: connector.name,
      slug: connector.slug,
      connectorType: connector.connectorType.value,
      description: connector.description || null,
      baseUrl: connector.baseUrl || null,
      authType: connector.authType,
      status: connector.status.value,
      healthStatus: connector.healthStatus,
      openApiSpec: connector.openApiSpec || null,
      config: connector.config || null,
      lastHealthCheckAt: connector.lastHealthCheckAt || null,
      lastError: connector.lastError || null,
      metadata: connector.metadata || null,
      deletedAt: connector.deletedAt || null,
      version: connector.version,
    };

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.connectors)
        .where(
          and(
            eq(schema.connectors.id, connector.id),
            eq(schema.connectors.tenantId, tenantId),
          ),
        );

      if (existing) {
        await tx
          .update(schema.connectors)
          .set({ ...raw, updatedAt: new Date() })
          .where(
            and(
              eq(schema.connectors.id, connector.id),
              eq(schema.connectors.tenantId, tenantId),
            ),
          );
      } else {
        await tx.insert(schema.connectors).values({
          ...raw,
          createdAt: connector.createdAt,
          updatedAt: connector.createdAt,
        });
      }

      for (const capability of connector.capabilities) {
        await tx
          .insert(schema.connectorCapabilities)
          .values({
            id: capability.id,
            tenantId,
            connectorId: connector.id,
            capabilityType: capability.capabilityType.value,
            name: capability.name,
            description: capability.description || null,
            method: capability.method,
            path: capability.path,
            requestMapping: capability.requestMapping || null,
            responseMapping: capability.responseMapping || null,
            inputSchema: capability.inputSchema || null,
            outputSchema: capability.outputSchema || null,
            enabled: capability.enabled,
            createdAt: capability.createdAt,
            updatedAt: capability.updatedAt,
          })
          .onConflictDoUpdate({
            target: [
              schema.connectorCapabilities.tenantId,
              schema.connectorCapabilities.connectorId,
              schema.connectorCapabilities.capabilityType,
            ],
            set: {
              name: capability.name,
              description: capability.description || null,
              method: capability.method,
              path: capability.path,
              requestMapping: capability.requestMapping || null,
              responseMapping: capability.responseMapping || null,
              inputSchema: capability.inputSchema || null,
              outputSchema: capability.outputSchema || null,
              enabled: capability.enabled,
              updatedAt: new Date(),
            },
          });
      }
    });

    return connector;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(schema.connectors)
      .where(
        and(
          eq(schema.connectors.id, id),
          eq(schema.connectors.tenantId, tenantId),
        ),
      );
    if (!existing) return false;
    await db
      .update(schema.connectors)
      .set({
        deletedAt: new Date(),
        status: ConnectorStatusEnum.DISABLED,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.connectors.id, id),
          eq(schema.connectors.tenantId, tenantId),
        ),
      );
    return true;
  }

  private buildConditions(
    tenantId: string,
    options: ConnectorQueryOptions,
  ): any[] {
    const conditions: any[] = [
      eq(schema.connectors.tenantId, tenantId),
      isNull(schema.connectors.deletedAt),
    ];
    if (options.connectorType)
      conditions.push(
        eq(schema.connectors.connectorType, options.connectorType),
      );
    if (options.status)
      conditions.push(eq(schema.connectors.status, options.status));
    if (options.healthStatus)
      conditions.push(eq(schema.connectors.healthStatus, options.healthStatus));
    if (options.search)
      conditions.push(
        or(
          ilike(schema.connectors.name, `%${options.search}%`),
          ilike(schema.connectors.slug, `%${options.search}%`),
        ),
      );
    return conditions;
  }

  async findPaginated(
    tenantId: string,
    options: ConnectorQueryOptions,
  ): Promise<PaginatedResult<Connector>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions = this.buildConditions(tenantId, options);
    if (options.cursor)
      conditions.push(gt(schema.connectors.id, options.cursor));

    const rows = await db
      .select()
      .from(schema.connectors)
      .where(and(...conditions))
      .orderBy(desc(schema.connectors.createdAt))
      .limit(limit)
      .offset(options.cursor ? 0 : offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.connectors)
      .where(and(...this.buildConditions(tenantId, options)));

    const data = rows.map((r) => ConnectorMapper.toDomain(r));
    const nextCursor =
      data.length === limit ? rows[rows.length - 1].id : undefined;
    return { data, total: Number(count), nextCursor };
  }

  async findActiveForHealthSweep(
    tenantId: string | undefined,
    limit: number,
  ): Promise<Connector[]> {
    const conditions: any[] = [
      isNull(schema.connectors.deletedAt),
      eq(schema.connectors.status, ConnectorStatusEnum.ACTIVE),
    ];
    if (tenantId) conditions.push(eq(schema.connectors.tenantId, tenantId));
    const rows = await db
      .select()
      .from(schema.connectors)
      .where(and(...conditions))
      .orderBy(asc(schema.connectors.lastHealthCheckAt))
      .limit(limit);
    return rows.map((r) => ConnectorMapper.toDomain(r));
  }

  // Capabilities

  async findCapabilityByType(
    tenantId: string,
    connectorId: string,
    capabilityType: string,
  ): Promise<ConnectorCapability | null> {
    const [row] = await db
      .select()
      .from(schema.connectorCapabilities)
      .where(
        and(
          eq(schema.connectorCapabilities.tenantId, tenantId),
          eq(schema.connectorCapabilities.connectorId, connectorId),
          eq(schema.connectorCapabilities.capabilityType, capabilityType),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.capabilityToDomain(row);
  }

  async resolveCapability(
    tenantId: string,
    capabilityType: string,
  ): Promise<{
    connector: Connector;
    capability: ConnectorCapability;
  } | null> {
    const [capRow] = await db
      .select()
      .from(schema.connectorCapabilities)
      .innerJoin(
        schema.connectors,
        eq(schema.connectorCapabilities.connectorId, schema.connectors.id),
      )
      .where(
        and(
          eq(schema.connectorCapabilities.tenantId, tenantId),
          eq(schema.connectorCapabilities.capabilityType, capabilityType),
          eq(schema.connectorCapabilities.enabled, true),
          eq(schema.connectors.status, ConnectorStatusEnum.ACTIVE),
          isNull(schema.connectors.deletedAt),
        ),
      )
      .orderBy(asc(schema.connectorCapabilities.createdAt))
      .limit(1);
    if (!capRow) return null;
    const connector = ConnectorMapper.toDomain(capRow.connectors);
    const capability = ConnectorMapper.capabilityToDomain(
      capRow.connector_capabilities,
    );
    return { connector, capability };
  }

  async findCapabilities(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorCapability[]> {
    const rows = await this.loadCapabilities(connectorId, tenantId);
    return rows.map((r) => ConnectorMapper.capabilityToDomain(r));
  }

  // Instances

  async saveInstance(
    instance: ConnectorInstance,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: instance.id,
      tenantId,
      connectorId: instance.connectorId,
      name: instance.name,
      environment: instance.environment,
      status: instance.status,
      healthStatus: instance.healthStatus,
      config: instance.config || null,
      lastHealthCheckAt: instance.lastHealthCheckAt || null,
      metadata: instance.metadata || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.connectorInstances)
      .where(
        and(
          eq(schema.connectorInstances.id, instance.id),
          eq(schema.connectorInstances.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.connectorInstances)
        .set(raw)
        .where(
          and(
            eq(schema.connectorInstances.id, instance.id),
            eq(schema.connectorInstances.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.connectorInstances)
        .values({ ...raw, createdAt: instance.createdAt });
    }
  }

  async getInstance(
    tenantId: string,
    instanceId: string,
  ): Promise<ConnectorInstance | null> {
    const [row] = await db
      .select()
      .from(schema.connectorInstances)
      .where(
        and(
          eq(schema.connectorInstances.tenantId, tenantId),
          eq(schema.connectorInstances.id, instanceId),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.instanceToDomain(row);
  }

  async findInstances(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorInstance[]> {
    const rows = await db
      .select()
      .from(schema.connectorInstances)
      .where(
        and(
          eq(schema.connectorInstances.tenantId, tenantId),
          eq(schema.connectorInstances.connectorId, connectorId),
        ),
      )
      .orderBy(asc(schema.connectorInstances.createdAt));
    return rows.map((r) => ConnectorMapper.instanceToDomain(r));
  }

  async deleteInstance(tenantId: string, instanceId: string): Promise<boolean> {
    const result = await db
      .delete(schema.connectorInstances)
      .where(
        and(
          eq(schema.connectorInstances.tenantId, tenantId),
          eq(schema.connectorInstances.id, instanceId),
        ),
      )
      .returning({ id: schema.connectorInstances.id });
    return result.length > 0;
  }

  // Credentials

  async saveCredential(
    credential: ConnectorCredential,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: credential.id,
      tenantId,
      connectorId: credential.connectorId,
      instanceId: credential.instanceId || null,
      authType: credential.authType,
      encryptedData: credential.encryptedData,
      keyId: credential.keyId || null,
      status: credential.status,
      expiresAt: credential.expiresAt || null,
      rotatedAt: credential.rotatedAt || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.connectorCredentials)
      .where(
        and(
          eq(schema.connectorCredentials.id, credential.id),
          eq(schema.connectorCredentials.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.connectorCredentials)
        .set(raw)
        .where(
          and(
            eq(schema.connectorCredentials.id, credential.id),
            eq(schema.connectorCredentials.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.connectorCredentials)
        .values({ ...raw, createdAt: credential.createdAt });
    }
  }

  async getActiveCredential(
    tenantId: string,
    connectorId: string,
    instanceId?: string,
  ): Promise<ConnectorCredential | null> {
    const conditions: any[] = [
      eq(schema.connectorCredentials.tenantId, tenantId),
      eq(schema.connectorCredentials.connectorId, connectorId),
      eq(schema.connectorCredentials.status, 'ACTIVE'),
    ];
    if (instanceId)
      conditions.push(eq(schema.connectorCredentials.instanceId, instanceId));
    const [row] = await db
      .select()
      .from(schema.connectorCredentials)
      .where(and(...conditions))
      .orderBy(desc(schema.connectorCredentials.createdAt))
      .limit(1);
    if (!row) return null;
    return ConnectorMapper.credentialToDomain(row);
  }

  async getCredentialById(
    tenantId: string,
    credentialId: string,
  ): Promise<ConnectorCredential | null> {
    const [row] = await db
      .select()
      .from(schema.connectorCredentials)
      .where(
        and(
          eq(schema.connectorCredentials.tenantId, tenantId),
          eq(schema.connectorCredentials.id, credentialId),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.credentialToDomain(row);
  }

  async findCredentials(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorCredential[]> {
    const rows = await db
      .select()
      .from(schema.connectorCredentials)
      .where(
        and(
          eq(schema.connectorCredentials.tenantId, tenantId),
          eq(schema.connectorCredentials.connectorId, connectorId),
        ),
      )
      .orderBy(desc(schema.connectorCredentials.createdAt));
    return rows.map((r) => ConnectorMapper.credentialToDomain(r));
  }

  // Executions

  async saveExecution(
    execution: ConnectorExecution,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: execution.id,
      tenantId,
      connectorId: execution.connectorId,
      instanceId: execution.instanceId || null,
      capabilityId: execution.capabilityId || null,
      capabilityType: execution.capabilityType,
      status: execution.status,
      statusCode: execution.statusCode ?? null,
      requestPayload: execution.requestPayload || null,
      responsePayload: execution.responsePayload || null,
      error: execution.error || null,
      attempt: execution.attempt,
      latencyMs: execution.latencyMs,
      workflowId: execution.workflowId || null,
      conversationId: execution.conversationId || null,
      ticketId: execution.ticketId || null,
      idempotencyKey: execution.idempotencyKey || null,
      startedAt: execution.startedAt || null,
      completedAt: execution.completedAt || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.connectorExecutions)
      .where(
        and(
          eq(schema.connectorExecutions.id, execution.id),
          eq(schema.connectorExecutions.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.connectorExecutions)
        .set(raw)
        .where(
          and(
            eq(schema.connectorExecutions.id, execution.id),
            eq(schema.connectorExecutions.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.connectorExecutions)
        .values({ ...raw, createdAt: execution.createdAt });
    }
  }

  async getExecution(
    tenantId: string,
    executionId: string,
  ): Promise<ConnectorExecution | null> {
    const [row] = await db
      .select()
      .from(schema.connectorExecutions)
      .where(
        and(
          eq(schema.connectorExecutions.tenantId, tenantId),
          eq(schema.connectorExecutions.id, executionId),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.executionToDomain(row);
  }

  async findExecutionByIdempotency(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ConnectorExecution | null> {
    const [row] = await db
      .select()
      .from(schema.connectorExecutions)
      .where(
        and(
          eq(schema.connectorExecutions.tenantId, tenantId),
          eq(schema.connectorExecutions.idempotencyKey, idempotencyKey),
        ),
      )
      .orderBy(desc(schema.connectorExecutions.createdAt))
      .limit(1);
    if (!row) return null;
    return ConnectorMapper.executionToDomain(row);
  }

  async findExecutions(
    tenantId: string,
    connectorId: string,
    options: ExecutionQueryOptions,
  ): Promise<PaginatedResult<ConnectorExecution>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    const conditions: any[] = [
      eq(schema.connectorExecutions.tenantId, tenantId),
      eq(schema.connectorExecutions.connectorId, connectorId),
    ];
    if (options.status)
      conditions.push(eq(schema.connectorExecutions.status, options.status));
    if (options.capabilityType)
      conditions.push(
        eq(schema.connectorExecutions.capabilityType, options.capabilityType),
      );

    const rows = await db
      .select()
      .from(schema.connectorExecutions)
      .where(and(...conditions))
      .orderBy(desc(schema.connectorExecutions.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.connectorExecutions)
      .where(and(...conditions));

    return {
      data: rows.map((r) => ConnectorMapper.executionToDomain(r)),
      total: Number(count),
    };
  }

  // Webhooks

  async saveWebhook(
    webhook: ConnectorWebhook,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: webhook.id,
      tenantId,
      connectorId: webhook.connectorId,
      instanceId: webhook.instanceId || null,
      url: webhook.url,
      secret: webhook.secret || null,
      signatureHeader: webhook.signatureHeader,
      events: webhook.events || null,
      status: webhook.status,
      lastTriggeredAt: webhook.lastTriggeredAt || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select()
      .from(schema.connectorWebhooks)
      .where(
        and(
          eq(schema.connectorWebhooks.id, webhook.id),
          eq(schema.connectorWebhooks.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.connectorWebhooks)
        .set(raw)
        .where(
          and(
            eq(schema.connectorWebhooks.id, webhook.id),
            eq(schema.connectorWebhooks.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.connectorWebhooks)
        .values({ ...raw, createdAt: webhook.createdAt });
    }
  }

  async getWebhook(
    tenantId: string,
    webhookId: string,
  ): Promise<ConnectorWebhook | null> {
    const [row] = await db
      .select()
      .from(schema.connectorWebhooks)
      .where(
        and(
          eq(schema.connectorWebhooks.tenantId, tenantId),
          eq(schema.connectorWebhooks.id, webhookId),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.webhookToDomain(row);
  }

  async findWebhooks(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorWebhook[]> {
    const rows = await db
      .select()
      .from(schema.connectorWebhooks)
      .where(
        and(
          eq(schema.connectorWebhooks.tenantId, tenantId),
          eq(schema.connectorWebhooks.connectorId, connectorId),
        ),
      )
      .orderBy(asc(schema.connectorWebhooks.createdAt));
    return rows.map((r) => ConnectorMapper.webhookToDomain(r));
  }

  async deleteWebhook(tenantId: string, webhookId: string): Promise<boolean> {
    const result = await db
      .delete(schema.connectorWebhooks)
      .where(
        and(
          eq(schema.connectorWebhooks.tenantId, tenantId),
          eq(schema.connectorWebhooks.id, webhookId),
        ),
      )
      .returning({ id: schema.connectorWebhooks.id });
    return result.length > 0;
  }

  // Rate limits

  async getRateLimit(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorRateLimit | null> {
    const [row] = await db
      .select()
      .from(schema.connectorRateLimits)
      .where(
        and(
          eq(schema.connectorRateLimits.tenantId, tenantId),
          eq(schema.connectorRateLimits.connectorId, connectorId),
        ),
      );
    if (!row) return null;
    return ConnectorMapper.rateLimitToDomain(row);
  }

  async upsertRateLimit(
    rateLimit: ConnectorRateLimit,
    tenantId: string,
  ): Promise<void> {
    const raw = {
      id: rateLimit.id,
      tenantId,
      connectorId: rateLimit.connectorId,
      instanceId: rateLimit.instanceId || null,
      windowSeconds: rateLimit.windowSeconds,
      maxRequests: rateLimit.maxRequests,
      currentUsage: rateLimit.currentUsage,
      resetAt: rateLimit.resetAt,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.connectorRateLimits)
      .values({ ...raw, createdAt: rateLimit.createdAt })
      .onConflictDoUpdate({
        target: [
          schema.connectorRateLimits.tenantId,
          schema.connectorRateLimits.connectorId,
        ],
        set: {
          windowSeconds: rateLimit.windowSeconds,
          maxRequests: rateLimit.maxRequests,
          currentUsage: rateLimit.currentUsage,
          resetAt: rateLimit.resetAt,
          updatedAt: new Date(),
        },
      });
  }

  // Logs

  async addLog(tenantId: string, log: ConnectorLogInput): Promise<void> {
    await db.insert(schema.connectorLogs).values({
      tenantId,
      connectorId: log.connectorId,
      instanceId: log.instanceId || null,
      executionId: log.executionId || null,
      level: log.level,
      message: log.message,
      context: log.context || null,
    });
  }
}

// Re-export for downstream consumers that filter due rate-limit windows.
export const __rateLimitDueHelpers = { lte };
