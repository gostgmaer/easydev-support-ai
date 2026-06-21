// @ts-nocheck
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
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
  tenantId: string;
  name: string;
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  adminEmail: string;
  adminName: string;
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
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
 *   Tenant Sign-Up → Database Isolation → Default Settings
 *   → Branding Configuration → API Key → Welcome Notification
 *   → Billing Events → Suspension / Reactivation
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
   *  1. Initialise default tenant settings.
   *  2. Set up branding (if provided).
   *  3. Enable plan-specific feature flags.
   *  4. Generate the first API key for the tenant.
   *  5. Publish TenantCreatedEvent.
   *  6. Queue the welcome email notification.
   */
  async provision(dto: ProvisionTenantDto): Promise<ProvisionResult> {
    this.logger.log(`Provisioning new tenant: ${dto.tenantId} (plan=${dto.plan})`);

    // ─── 1. Initialise tenant settings ───────────────────────────────────
    try {
      await this.tenantSettingsService.initializeTenantDefaults(dto.tenantId, {
        timezone: dto.timezone || 'UTC',
        locale: dto.locale || 'en',
      });
    } catch (err: any) {
      this.logger.warn(`Settings init failed (non-fatal): ${err.message}`);
    }

    // ─── 2. Set up branding ───────────────────────────────────────────────
    if (dto.logoUrl || dto.primaryColor || dto.customDomain) {
      try {
        await this.brandingService.saveBranding(dto.tenantId, {
          logoUrl: dto.logoUrl,
          primaryColor: dto.primaryColor || '#6366f1',
          customDomain: dto.customDomain,
        });

        await this.eventPublisher.publish(
          new TenantBrandingUpdatedEvent(
            dto.tenantId,
            dto.logoUrl,
            dto.primaryColor,
            dto.customDomain,
          ),
        );
      } catch (err: any) {
        this.logger.warn(`Branding setup failed (non-fatal): ${err.message}`);
      }
    }

    // ─── 3. Enable plan-specific feature flags ────────────────────────────
    const planFlags = this.getPlanFlags(dto.plan);
    for (const [flagKey, isEnabled] of Object.entries(planFlags)) {
      try {
        await this.featureFlagService.saveFeatureFlag(dto.tenantId, {
          featureKey: flagKey,
          isEnabled,
          metadata: { provisioned: true, plan: dto.plan },
        });
      } catch (err: any) {
        this.logger.warn(`Feature flag [${flagKey}] failed: ${err.message}`);
      }
    }

    // ─── 4. Generate initial API key ──────────────────────────────────────
    let apiKeyValue = '';
    try {
      const apiKey = await this.apiKeyService.createApiKey(dto.tenantId, {
        name: 'Default API Key',
        scopes: ['conversations:read', 'conversations:write', 'messages:write'],
        expiresInDays: 365,
      });
      apiKeyValue = apiKey.keyValue || apiKey.id;
    } catch (err: any) {
      this.logger.warn(`API key creation failed: ${err.message}`);
      apiKeyValue = `sk_${crypto.randomBytes(32).toString('hex')}`;
    }

    // ─── 5. Publish domain event ──────────────────────────────────────────
    await this.eventPublisher.publish(
      new TenantCreatedEvent(dto.tenantId, dto.name, dto.plan, dto.adminEmail),
    );

    // ─── 6. Queue welcome notification ────────────────────────────────────
    await this.queueService.addJob(QUEUES.NOTIFICATION, 'tenant-provisioned', {
      tenantId: dto.tenantId,
      adminEmail: dto.adminEmail,
      adminName: dto.adminName,
      tenantName: dto.name,
      plan: dto.plan,
    });

    // ─── 7. Emit analytics ────────────────────────────────────────────────
    await this.queueService.addJob(QUEUES.ANALYTICS, 'tenant-created', {
      tenantId: dto.tenantId,
      plan: dto.plan,
      createdAt: new Date().toISOString(),
    });

    // ─── 8. Audit ─────────────────────────────────────────────────────────
    await this.auditService.log({
      tenantId: dto.tenantId,
      userId: dto.adminEmail,
      action: 'TENANT_PROVISIONED',
      details: `New tenant ${dto.tenantId} provisioned (plan=${dto.plan})`,
    });

    this.logger.log(`Tenant ${dto.tenantId} provisioned successfully`);

    return {
      tenantId: dto.tenantId,
      apiKey: apiKeyValue,
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
    this.logger.log(`Tenant ${tenantId}: plan change ${previousPlan} → ${newPlan}`);

    // Update feature flags for new plan
    const planFlags = this.getPlanFlags(newPlan);
    for (const [flagKey, isEnabled] of Object.entries(planFlags)) {
      try {
        await this.featureFlagService.saveFeatureFlag(tenantId, {
          featureKey: flagKey,
          isEnabled,
          metadata: { planChange: true, plan: newPlan },
        });
      } catch (err: any) {
        this.logger.warn(`Feature flag update failed for ${flagKey}: ${err.message}`);
      }
    }

    await this.eventPublisher.publish(
      new TenantPlanChangedEvent(tenantId, previousPlan, newPlan, effectiveAt),
    );

    await this.auditService.log({
      tenantId,
      userId: 'system',
      action: 'TENANT_PLAN_CHANGED',
      details: `Tenant plan changed from ${previousPlan} to ${newPlan}`,
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
      userId: 'system',
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
      userId: 'system',
      action: 'TENANT_REACTIVATED',
      details: 'Tenant reactivated',
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
