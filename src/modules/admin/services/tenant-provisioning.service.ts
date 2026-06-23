import { Injectable, Logger } from '@nestjs/common';
import { AdminApiKeyService } from './admin-api-key.service';
import { AdminEventPublisher } from './admin-event.publisher';
import { TenantSettingsService } from '../../settings/services/tenant-settings.service';
import { BrandingService } from '../../settings/services/branding.service';
import { FeatureFlagService } from '../../settings/services/feature-flag.service';
import { QueueService, QUEUES } from '@easydev/shared-queues';
import { AuditService } from '../../audit/audit.service';
import {
  TenantCreatedEvent,
  TenantBrandingUpdatedEvent,
  TenantPlanChangedEvent,
  TenantSuspendedEvent,
  TenantReactivatedEvent,
} from '@easydev/shared-events';

export interface ProvisionTenantDto {
  name: string;
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  adminEmail: string;
  adminName: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
}

export interface ProvisionResult {
  tenantId: string;
  apiKey: string;
  plan: string;
  provisionedAt: Date;
}

/**
 * TenantProvisioningService  (FLOW 12 – Multi-Tenant Lifecycle)
 *
 * Handles the full lifecycle of a tenant:
 *   Tenant Sign-Up → Default Settings → Branding Configuration
 *   → API Key → Welcome Notification → Billing Events → Suspension / Reactivation
 *
 * The tenant itself (its id, and the calling admin's JWT for it) is created
 * upstream in the EasyDev IAM service - TenantGuard requires a valid
 * tenant-scoped JWT on every request, so this service can't be the thing that
 * creates a tenant from nothing. What it does instead is provision this
 * product's own per-tenant resources (settings, branding, feature flags, the
 * first API key) for a tenant that IAM already knows about.
 */
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);

  constructor(
    private readonly apiKeyService: AdminApiKeyService,
    private readonly eventPublisher: AdminEventPublisher,
    private readonly tenantSettingsService: TenantSettingsService,
    private readonly brandingService: BrandingService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly queueService: QueueService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Provision a brand-new tenant:
   *  1. Initialise tenant settings (name, timezone, locale).
   *  2. Set up branding (if provided).
   *  3. Enable plan-specific feature flags.
   *  4. Generate the first API key for the tenant.
   *  5. Publish TenantCreatedEvent.
   *  6. Queue the welcome email notification.
   */
  async provision(
    tenantId: string,
    dto: ProvisionTenantDto,
    actorUserId?: string,
  ): Promise<ProvisionResult> {
    this.logger.log(`Provisioning new tenant: ${tenantId} (plan=${dto.plan})`);

    // ─── 1. Initialise tenant settings ───────────────────────────────────
    try {
      await this.tenantSettingsService.updateSettings(tenantId, {
        tenantName: dto.name,
        timezone: dto.timezone || 'UTC',
        locale: dto.locale || 'en',
      });
    } catch (err: any) {
      this.logger.warn(`Settings init failed (non-fatal): ${err.message}`);
    }

    // ─── 2. Set up branding ───────────────────────────────────────────────
    if (dto.logoUrl || dto.primaryColor) {
      try {
        await this.brandingService.updateBranding(tenantId, {
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor || '#6366f1',
        });

        await this.eventPublisher.publish(
          new TenantBrandingUpdatedEvent(
            tenantId,
            dto.logoUrl,
            dto.primaryColor,
          ),
        );
      } catch (err: any) {
        this.logger.warn(`Branding setup failed (non-fatal): ${err.message}`);
      }
    }

    // ─── 3. Enable plan-specific feature flags ────────────────────────────
    const planFlags = this.getPlanFlags(dto.plan);
    for (const [flagKey, enabled] of Object.entries(planFlags)) {
      try {
        await this.featureFlagService.saveFeatureFlag(tenantId, {
          featureKey: flagKey,
          enabled,
          rolloutPercentage: 100,
          configuration: { provisioned: true, plan: dto.plan },
        });
      } catch (err: any) {
        this.logger.warn(`Feature flag [${flagKey}] failed: ${err.message}`);
      }
    }

    // ─── 4. Generate initial API key ──────────────────────────────────────
    const { rawKey } = await this.apiKeyService.createApiKey(tenantId, {
      name: 'Default API Key',
      scopes: ['conversations:read', 'conversations:write', 'messages:write'],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // ─── 5. Publish domain event ──────────────────────────────────────────
    await this.eventPublisher.publish(
      new TenantCreatedEvent(tenantId, dto.name, dto.plan, dto.adminEmail),
    );

    // ─── 6. Queue welcome notification ────────────────────────────────────
    await this.queueService.addJob(QUEUES.NOTIFICATION, 'tenant-provisioned', {
      tenantId,
      adminEmail: dto.adminEmail,
      adminName: dto.adminName,
      tenantName: dto.name,
      plan: dto.plan,
    });

    // ─── 7. Emit analytics ────────────────────────────────────────────────
    await this.queueService.addJob(QUEUES.ANALYTICS, 'tenant-created', {
      tenantId,
      plan: dto.plan,
      createdAt: new Date().toISOString(),
    });

    // ─── 8. Audit ─────────────────────────────────────────────────────────
    // userId must be a real IAM user UUID (audit_logs.user_id is uuid-typed) -
    // dto.adminEmail is an arbitrary notification address, not the caller's id.
    await this.auditService.log({
      tenantId,
      userId: actorUserId,
      action: 'TENANT_PROVISIONED',
      details: `Tenant ${tenantId} provisioned (plan=${dto.plan}, adminEmail=${dto.adminEmail})`,
    });

    this.logger.log(`Tenant ${tenantId} provisioned successfully`);

    return {
      tenantId,
      apiKey: rawKey,
      plan: dto.plan,
      provisionedAt: new Date(),
    };
  }

  /**
   * Handle plan change (upgrade / downgrade).
   */
  async changePlan(
    tenantId: string,
    newPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE',
    previousPlan: string,
    effectiveAt: Date = new Date(),
  ): Promise<void> {
    this.logger.log(
      `Tenant ${tenantId}: plan change ${previousPlan} → ${newPlan}`,
    );

    // Update feature flags for new plan
    const planFlags = this.getPlanFlags(newPlan);
    for (const [flagKey, enabled] of Object.entries(planFlags)) {
      try {
        await this.featureFlagService.saveFeatureFlag(tenantId, {
          featureKey: flagKey,
          enabled,
          rolloutPercentage: 100,
          configuration: { planChange: true, plan: newPlan },
        });
      } catch (err: any) {
        this.logger.warn(
          `Feature flag update failed for ${flagKey}: ${err.message}`,
        );
      }
    }

    await this.eventPublisher.publish(
      new TenantPlanChangedEvent(tenantId, previousPlan, newPlan, effectiveAt),
    );

    await this.auditService.log({
      tenantId,
      action: 'TENANT_PLAN_CHANGED',
      details: `Tenant plan changed from ${previousPlan} to ${newPlan} (system)`,
    });
  }

  /**
   * Suspend a tenant (billing failure or policy violation).
   */
  async suspend(tenantId: string, reason: string): Promise<void> {
    this.logger.warn(`Suspending tenant ${tenantId}: ${reason}`);

    await this.eventPublisher.publish(
      new TenantSuspendedEvent(tenantId, reason),
    );

    await this.auditService.log({
      tenantId,
      action: 'TENANT_SUSPENDED',
      details: reason,
    });
  }

  /**
   * Reactivate a previously suspended tenant.
   */
  async reactivate(tenantId: string): Promise<void> {
    this.logger.log(`Reactivating tenant ${tenantId}`);

    await this.eventPublisher.publish(new TenantReactivatedEvent(tenantId));

    await this.auditService.log({
      tenantId,
      action: 'TENANT_REACTIVATED',
      details: 'Tenant reactivated (system)',
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private getPlanFlags(plan: string): Record<string, boolean> {
    const baseFlags: Record<string, boolean> = {
      'ai.responses': true,
      'knowledge.base': true,
      'widget.embed': true,
      'ticket.management': true,
    };

    if (plan === 'GROWTH' || plan === 'ENTERPRISE') {
      Object.assign(baseFlags, {
        'workflow.automation': true,
        'analytics.advanced': true,
        'multi.channel': true,
        'connector.custom': true,
        'ai.drafts': true,
        'csat.surveys': true,
      });
    }

    if (plan === 'ENTERPRISE') {
      Object.assign(baseFlags, {
        'sso.saml': true,
        'audit.export': true,
        'sla.advanced': true,
        'custom.domain': true,
        'white.label': true,
        'priority.support': true,
      });
    }

    return baseFlags;
  }
}
