import { ForbiddenException, Injectable, Inject, Logger } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { UsageLimits } from '../domain/entities';
import { UpdateUsageLimitsDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { PaymentClient } from '@easydev/shared-clients';
import Redis from 'ioredis';

const BILLING_SYNC_TTL_SECONDS = 3600;

@Injectable()
export class UsageLimitService {
  private readonly logger = new Logger(UsageLimitService.name);
  private readonly paymentClient: PaymentClient;
  private readonly redis: Redis;

  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
    private readonly queueService: QueueService,
  ) {
    this.paymentClient = new PaymentClient(
      process.env.PAYMENT_SERVICE_URL || 'http://localhost:3302',
      process.env.PAYMENT_SERVICE_API_KEY || '',
      process.env.FILE_UPLOAD_HMAC_SECRET,
    );
    // Same best-effort, never-block-the-hot-path Redis pattern already used
    // by RedisCacheService/CircuitBreakerManager - this is purely a throttle
    // on how often the real payment service gets called, not a dependency
    // for correctness (falls back to "sync every call" if Redis is down,
    // which is still correct, just less efficient).
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => {});
    this.redis.connect().catch(() => {});
  }

  /** Fetch-or-create with NO billing sync triggered - used internally by
   * both getUsageLimits() and updateUsageLimits() so the latter can't
   * recurse back into a sync attempt. */
  private async getOrCreateRawLimits(tenantId: string): Promise<UsageLimits> {
    let limits = await this.settingsRepo.getUsageLimits(tenantId);
    if (!limits) {
      limits = new UsageLimits(uuidv4(), {
        tenantId,
        maxAgents: 10,
        maxConversations: 1000,
        maxMessages: 10000,
        maxWorkflows: 5,
        maxConnectors: 3,
        maxDocuments: 50,
        maxStorage: 1073741824, // 1 GB
        maxAiRequests: 5000,
      });
      await this.settingsRepo.saveUsageLimits(limits);
    }
    return limits;
  }

  async getUsageLimits(tenantId: string): Promise<UsageLimits> {
    const limits = await this.getOrCreateRawLimits(tenantId);
    await this.maybeSyncFromBilling(tenantId);
    // Re-read: the sync above may have just persisted fresher values.
    return (await this.settingsRepo.getUsageLimits(tenantId)) ?? limits;
  }

  /**
   * Pulls real quota limits from the tenant's actual subscription
   * (payment-microservice's Plan.metadata.quotas, verified against that
   * service's real schema/endpoint - GET /api/v1/subscriptions/active) when
   * present, instead of relying solely on the hardcoded defaults above.
   * Throttled to once per tenant per hour via Redis so this never adds
   * billing-service latency to the hot enforcement path (conversation/
   * connector creation, AI auto-response) on every single call. No real
   * plan has quota metadata populated yet, so today this is a no-op in
   * practice - it activates automatically the moment billing populates
   * Plan.metadata.quotas for a tenant's plan, with no code change needed.
   */
  private async maybeSyncFromBilling(tenantId: string): Promise<void> {
    const throttleKey = `billing-sync:${tenantId}`;
    try {
      const alreadySynced = await this.redis.get(throttleKey);
      if (alreadySynced) return;
    } catch {
      // Redis unavailable - fall through and sync anyway rather than skip;
      // worst case this runs more often than the 1h throttle until Redis
      // recovers, never less often.
    }

    try {
      const status = await this.paymentClient.getTenantSubscriptionStatus(tenantId);
      const quotas = status?.subscription?.plan?.metadata?.quotas;
      const sanitized = this.sanitizeQuotas(quotas);
      if (sanitized) {
        await this.updateUsageLimits(tenantId, sanitized);
        this.logger.log(`Synced usage limits for tenant ${tenantId} from billing plan metadata`);
      }
    } catch (err: any) {
      this.logger.warn(`Billing sync failed for tenant ${tenantId}: ${err.message}`);
    }

    try {
      await this.redis.set(throttleKey, '1', 'EX', BILLING_SYNC_TTL_SECONDS);
    } catch {
      // best-effort throttle only
    }
  }

  /**
   * Plan.metadata is an untyped JSONB column owned by a different service's
   * database - only accept fields that are actually finite, non-negative
   * numbers. A malformed/partial metadata object (e.g. a string, NaN, or a
   * stray negative value) must never corrupt a live enforcement limit.
   */
  private sanitizeQuotas(quotas: unknown): UpdateUsageLimitsDto | null {
    if (!quotas || typeof quotas !== 'object') return null;
    const allowedKeys: Array<keyof UpdateUsageLimitsDto> = [
      'maxAgents',
      'maxConversations',
      'maxMessages',
      'maxWorkflows',
      'maxConnectors',
      'maxDocuments',
      'maxStorage',
      'maxAiRequests',
    ];
    const out: UpdateUsageLimitsDto = {};
    for (const key of allowedKeys) {
      const value = (quotas as Record<string, unknown>)[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        out[key] = value;
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  async updateUsageLimits(
    tenantId: string,
    dto: UpdateUsageLimitsDto,
  ): Promise<UsageLimits> {
    // Raw accessor, not getUsageLimits() - maybeSyncFromBilling() calls this
    // method, so going through getUsageLimits() here would recurse.
    const limits = await this.getOrCreateRawLimits(tenantId);
    limits.update({
      maxAgents: dto.maxAgents !== undefined ? dto.maxAgents : limits.maxAgents,
      maxConversations:
        dto.maxConversations !== undefined
          ? dto.maxConversations
          : limits.maxConversations,
      maxMessages:
        dto.maxMessages !== undefined ? dto.maxMessages : limits.maxMessages,
      maxWorkflows:
        dto.maxWorkflows !== undefined ? dto.maxWorkflows : limits.maxWorkflows,
      maxConnectors:
        dto.maxConnectors !== undefined
          ? dto.maxConnectors
          : limits.maxConnectors,
      maxDocuments:
        dto.maxDocuments !== undefined ? dto.maxDocuments : limits.maxDocuments,
      maxStorage:
        dto.maxStorage !== undefined ? dto.maxStorage : limits.maxStorage,
      maxAiRequests:
        dto.maxAiRequests !== undefined
          ? dto.maxAiRequests
          : limits.maxAiRequests,
    });

    await this.settingsRepo.saveUsageLimits(limits);
    await this.eventPublisher.publish(
      tenantId,
      'usage_limit.updated',
      limits.toJSON(),
    );
    return limits;
  }

  /**
   * UsageLimits stored plan ceilings but nothing in the codebase ever
   * compared real usage against them - a tenant could exceed every plan
   * limit with zero rejection. Hard-blocks once usage reaches the limit and
   * opens/escalates an operational incident (reusing the same
   * 'admin-incident-job' pipeline already wired for connector failures) so
   * ops has visibility into the overage rather than the tenant just being
   * silently blocked with no one aware billing/upgrade action may be needed.
   */
  async enforceLimit(
    tenantId: string,
    resource: 'conversations' | 'connectors' | 'aiRequests',
    currentUsage: number,
  ): Promise<void> {
    const limits = await this.getUsageLimits(tenantId);
    const limitByResource: Record<typeof resource, number> = {
      conversations: limits.maxConversations,
      connectors: limits.maxConnectors,
      aiRequests: limits.maxAiRequests,
    };
    const limit = limitByResource[resource];

    if (currentUsage < limit) return;

    try {
      await this.queueService.addJob(QUEUES.ADMIN, 'admin-incident-job', {
        tenantId,
        affectedService: `quota.${resource}`,
        title: `Tenant exceeded ${resource} plan limit`,
        severity: 'MEDIUM',
        description: `Tenant has reached ${currentUsage}/${limit} ${resource}. The triggering action was blocked. Overage billing or a plan upgrade may be needed to raise this limit.`,
      });
    } catch {
      // The throw below is the actual enforcement - incident visibility is
      // best-effort and must never be the reason enforcement fails to apply.
    }

    throw new ForbiddenException(
      `You've reached your plan's ${resource} limit (${limit}). Upgrade your plan or contact billing about overage charges to continue.`,
    );
  }
}
