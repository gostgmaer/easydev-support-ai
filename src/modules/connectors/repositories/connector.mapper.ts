import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { ConnectorInstance } from '../domain/connector-instance.entity';
import { ConnectorCredential } from '../domain/connector-credential.entity';
import { ConnectorExecution } from '../domain/connector-execution.entity';
import { ConnectorWebhook } from '../domain/connector-webhook.entity';
import { ConnectorRateLimit } from '../domain/connector-rate-limit.entity';
import {
  ConnectorType,
  ConnectorTypeEnum,
  ConnectorStatus,
  ConnectorStatusEnum,
  CapabilityType,
  CapabilityTypeEnum,
  AuthTypeEnum,
  HealthStatusEnum,
  ExecutionStatusEnum,
} from '../domain/value-objects';
import { CredentialStatusEnum } from '../domain/connector-credential.entity';
import { InstanceStatusEnum } from '../domain/connector-instance.entity';

export class ConnectorMapper {
  public static capabilityToDomain(raw: any): ConnectorCapability {
    return new ConnectorCapability(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      capabilityType: CapabilityType.create(
        raw.capabilityType as CapabilityTypeEnum,
      ),
      name: raw.name,
      description: raw.description || undefined,
      method: (raw.method || 'GET') as any,
      path: raw.path,
      requestMapping: (raw.requestMapping as Record<string, any>) || undefined,
      responseMapping:
        (raw.responseMapping as Record<string, any>) || undefined,
      inputSchema: (raw.inputSchema as Record<string, any>) || undefined,
      outputSchema: (raw.outputSchema as Record<string, any>) || undefined,
      enabled: raw.enabled ?? true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static instanceToDomain(raw: any): ConnectorInstance {
    return new ConnectorInstance(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      name: raw.name,
      environment: raw.environment || 'production',
      status: (raw.status || InstanceStatusEnum.ACTIVE) as InstanceStatusEnum,
      healthStatus: (raw.healthStatus ||
        HealthStatusEnum.UNKNOWN) as HealthStatusEnum,
      config: (raw.config as Record<string, any>) || {},
      lastHealthCheckAt: raw.lastHealthCheckAt || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static credentialToDomain(raw: any): ConnectorCredential {
    return new ConnectorCredential(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      instanceId: raw.instanceId || undefined,
      authType: (raw.authType || AuthTypeEnum.NONE) as AuthTypeEnum,
      encryptedData: raw.encryptedData,
      keyId: raw.keyId || undefined,
      status: (raw.status ||
        CredentialStatusEnum.ACTIVE) as CredentialStatusEnum,
      expiresAt: raw.expiresAt || undefined,
      rotatedAt: raw.rotatedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static executionToDomain(raw: any): ConnectorExecution {
    return new ConnectorExecution(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      instanceId: raw.instanceId || undefined,
      capabilityId: raw.capabilityId || undefined,
      capabilityType: raw.capabilityType,
      status: (raw.status ||
        ExecutionStatusEnum.PENDING) as ExecutionStatusEnum,
      statusCode: raw.statusCode ?? undefined,
      requestPayload: (raw.requestPayload as Record<string, any>) || undefined,
      responsePayload:
        (raw.responsePayload as Record<string, any>) || undefined,
      error: raw.error || undefined,
      attempt: raw.attempt || 1,
      latencyMs: raw.latencyMs ?? 0,
      workflowId: raw.workflowId || undefined,
      conversationId: raw.conversationId || undefined,
      ticketId: raw.ticketId || undefined,
      idempotencyKey: raw.idempotencyKey || undefined,
      startedAt: raw.startedAt || undefined,
      completedAt: raw.completedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static webhookToDomain(raw: any): ConnectorWebhook {
    return new ConnectorWebhook(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      instanceId: raw.instanceId || undefined,
      url: raw.url,
      secret: raw.secret || undefined,
      signatureHeader: raw.signatureHeader || 'x-signature',
      events: (raw.events as string[]) || [],
      status: raw.status || 'ACTIVE',
      lastTriggeredAt: raw.lastTriggeredAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static rateLimitToDomain(raw: any): ConnectorRateLimit {
    return new ConnectorRateLimit(raw.id, {
      tenantId: raw.tenantId,
      connectorId: raw.connectorId,
      instanceId: raw.instanceId || undefined,
      windowSeconds: raw.windowSeconds ?? 60,
      maxRequests: raw.maxRequests ?? 1000,
      currentUsage: raw.currentUsage ?? 0,
      resetAt: raw.resetAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static toDomain(raw: any, rawCapabilities: any[] = []): Connector {
    return new Connector(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      slug: raw.slug,
      connectorType: ConnectorType.create(
        raw.connectorType as ConnectorTypeEnum,
      ),
      description: raw.description || undefined,
      baseUrl: raw.baseUrl || undefined,
      authType: (raw.authType || AuthTypeEnum.NONE) as AuthTypeEnum,
      status: ConnectorStatus.create(raw.status as ConnectorStatusEnum),
      healthStatus: (raw.healthStatus ||
        HealthStatusEnum.UNKNOWN) as HealthStatusEnum,
      openApiSpec: (raw.openApiSpec as Record<string, any>) || undefined,
      config: (raw.config as Record<string, any>) || {},
      lastHealthCheckAt: raw.lastHealthCheckAt || undefined,
      lastError: raw.lastError || undefined,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
      capabilities: rawCapabilities.map((c) =>
        ConnectorMapper.capabilityToDomain(c),
      ),
    });
  }
}
