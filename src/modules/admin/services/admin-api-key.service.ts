import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  IAdminRepository,
  PaginatedResult,
} from '../repositories/admin-repository.interface';
import { ApiKey } from '../domain/api-key.entity';
import { AdminEventPublisher } from './admin-event.publisher';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import {
  AdminApiKeyCreatedEvent,
  AdminApiKeyRevokedEvent,
} from '@easydev/shared-events';
import { CreateApiKeyDto } from '../dtos';

const KEY_PREFIX = 'eda';

@Injectable()
export class AdminApiKeyService {
  private readonly hashSecret: string;

  constructor(
    @Inject('IAdminRepository')
    private readonly repository: IAdminRepository,
    private readonly eventPublisher: AdminEventPublisher,
    private readonly queueService: QueueService,
  ) {
    this.hashSecret =
      process.env.ADMIN_API_KEY_HASH_SECRET ||
      'easydev_admin_api_key_hash_secret_fallback';
  }

  private hash(rawKey: string): string {
    return crypto
      .createHmac('sha256', this.hashSecret)
      .update(rawKey)
      .digest('hex');
  }

  private async enqueueAudit(
    tenantId: string,
    action: string,
    details: string,
    userId?: string,
  ): Promise<void> {
    await this.queueService.addJob(QUEUES.ADMIN, 'admin-audit-job', {
      tenantId,
      userId,
      action,
      details,
      createdBy: userId,
    });
  }

  public async createApiKey(
    tenantId: string,
    dto: CreateApiKeyDto,
    createdBy?: string,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const secret = crypto.randomBytes(32).toString('base64url');
    const displayPrefix = crypto.randomBytes(4).toString('hex');
    const rawKey = `${KEY_PREFIX}_${displayPrefix}_${secret}`;
    const keyHash = this.hash(rawKey);

    const apiKey = ApiKey.create(crypto.randomUUID(), {
      tenantId,
      name: dto.name,
      keyHash,
      keyPrefix: `${KEY_PREFIX}_${displayPrefix}`,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      createdBy,
    });

    await this.repository.saveApiKey(apiKey, tenantId);
    await this.eventPublisher.publish(
      new AdminApiKeyCreatedEvent(tenantId, apiKey.id, apiKey.name),
    );
    await this.enqueueAudit(
      tenantId,
      'API_KEY_CREATED',
      `API key "${apiKey.name}" created with scopes [${dto.scopes.join(', ')}]`,
      createdBy,
    );

    return { apiKey, rawKey };
  }

  public async rotateApiKey(
    tenantId: string,
    id: string,
    rotatedBy?: string,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const existing = await this.getApiKey(tenantId, id);
    existing.revoke();
    await this.repository.saveApiKey(existing, tenantId);

    const created = await this.createApiKey(
      tenantId,
      {
        name: `${existing.name} (rotated)`,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt?.toISOString(),
      },
      rotatedBy,
    );

    await this.enqueueAudit(
      tenantId,
      'API_KEY_ROTATED',
      `API key "${existing.name}" rotated to new key ${created.apiKey.id}`,
      rotatedBy,
    );

    return created;
  }

  public async revokeApiKey(
    tenantId: string,
    id: string,
    revokedBy?: string,
    reason?: string,
  ): Promise<ApiKey> {
    const apiKey = await this.getApiKey(tenantId, id);
    apiKey.revoke();
    await this.repository.saveApiKey(apiKey, tenantId);
    await this.eventPublisher.publish(
      new AdminApiKeyRevokedEvent(tenantId, apiKey.id, reason),
    );
    await this.enqueueAudit(
      tenantId,
      'API_KEY_REVOKED',
      `API key "${apiKey.name}" revoked${reason ? `: ${reason}` : ''}`,
      revokedBy,
    );
    return apiKey;
  }

  public async getApiKey(tenantId: string, id: string): Promise<ApiKey> {
    const apiKey = await this.repository.getApiKey(tenantId, id);
    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }
    return apiKey;
  }

  public async listApiKeys(
    tenantId: string,
    status?: string,
  ): Promise<PaginatedResult<ApiKey>> {
    return this.repository.listApiKeys(tenantId, { status });
  }

  public async validateApiKey(
    rawKey: string,
    requiredScope?: string,
  ): Promise<{ apiKey: ApiKey; tenantId: string }> {
    const keyHash = this.hash(rawKey);
    const found = await this.repository.getApiKeyByHash(keyHash);
    if (!found) {
      throw new UnauthorizedException('Invalid API key');
    }
    const { apiKey, tenantId } = found;
    if (!apiKey.isUsable()) {
      throw new UnauthorizedException('API key is revoked or expired');
    }
    if (requiredScope && !apiKey.hasScope(requiredScope)) {
      throw new UnauthorizedException(
        `API key does not have the required scope: ${requiredScope}`,
      );
    }

    apiKey.recordUsage();
    await this.repository.saveApiKey(apiKey, tenantId);
    return { apiKey, tenantId };
  }
}
