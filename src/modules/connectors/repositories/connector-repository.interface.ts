import { ITenantRepository } from '@easydev/shared-kernel';
import { Connector } from '../domain/connector.aggregate';
import { ConnectorCapability } from '../domain/connector-capability.entity';
import { ConnectorInstance } from '../domain/connector-instance.entity';
import { ConnectorCredential } from '../domain/connector-credential.entity';
import { ConnectorExecution } from '../domain/connector-execution.entity';
import { ConnectorWebhook } from '../domain/connector-webhook.entity';
import { ConnectorRateLimit } from '../domain/connector-rate-limit.entity';

export interface ConnectorQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  connectorType?: string;
  status?: string;
  healthStatus?: string;
  search?: string;
}

export interface ExecutionQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  capabilityType?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  nextCursor?: string;
}

export interface ConnectorLogInput {
  connectorId: string;
  instanceId?: string;
  executionId?: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: Record<string, any>;
}

export interface IConnectorRepository extends ITenantRepository<
  Connector,
  string
> {
  findBySlug(tenantId: string, slug: string): Promise<Connector | null>;
  findPaginated(
    tenantId: string,
    options: ConnectorQueryOptions,
  ): Promise<PaginatedResult<Connector>>;
  findActiveForHealthSweep(
    tenantId: string | undefined,
    limit: number,
  ): Promise<Connector[]>;

  // Capabilities
  findCapabilityByType(
    tenantId: string,
    connectorId: string,
    capabilityType: string,
  ): Promise<ConnectorCapability | null>;
  resolveCapability(
    tenantId: string,
    capabilityType: string,
  ): Promise<{ connector: Connector; capability: ConnectorCapability } | null>;
  findCapabilities(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorCapability[]>;

  // Instances
  saveInstance(instance: ConnectorInstance, tenantId: string): Promise<void>;
  getInstance(
    tenantId: string,
    instanceId: string,
  ): Promise<ConnectorInstance | null>;
  findInstances(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorInstance[]>;
  deleteInstance(tenantId: string, instanceId: string): Promise<boolean>;

  // Credentials
  saveCredential(
    credential: ConnectorCredential,
    tenantId: string,
  ): Promise<void>;
  getActiveCredential(
    tenantId: string,
    connectorId: string,
    instanceId?: string,
  ): Promise<ConnectorCredential | null>;
  getCredentialById(
    tenantId: string,
    credentialId: string,
  ): Promise<ConnectorCredential | null>;
  findCredentials(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorCredential[]>;

  // Executions
  saveExecution(execution: ConnectorExecution, tenantId: string): Promise<void>;
  getExecution(
    tenantId: string,
    executionId: string,
  ): Promise<ConnectorExecution | null>;
  findExecutionByIdempotency(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ConnectorExecution | null>;
  findExecutions(
    tenantId: string,
    connectorId: string,
    options: ExecutionQueryOptions,
  ): Promise<PaginatedResult<ConnectorExecution>>;

  // Webhooks
  saveWebhook(webhook: ConnectorWebhook, tenantId: string): Promise<void>;
  getWebhook(
    tenantId: string,
    webhookId: string,
  ): Promise<ConnectorWebhook | null>;
  findWebhooks(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorWebhook[]>;
  deleteWebhook(tenantId: string, webhookId: string): Promise<boolean>;

  // Rate limits
  getRateLimit(
    tenantId: string,
    connectorId: string,
  ): Promise<ConnectorRateLimit | null>;
  upsertRateLimit(
    rateLimit: ConnectorRateLimit,
    tenantId: string,
  ): Promise<void>;

  // Logs
  addLog(tenantId: string, log: ConnectorLogInput): Promise<void>;
}
