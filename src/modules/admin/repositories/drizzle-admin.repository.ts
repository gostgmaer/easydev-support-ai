import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and, ne, lte, sql, desc, asc } from 'drizzle-orm';
import { AdminDashboard } from '../domain/admin-dashboard.aggregate';
import { AdminWidget } from '../domain/admin-widget.entity';
import { Announcement } from '../domain/announcement.entity';
import { AuditView } from '../domain/audit-view.entity';
import { FeatureAccess } from '../domain/feature-access.entity';
import { ApiKey } from '../domain/api-key.entity';
import { Webhook } from '../domain/webhook.entity';
import { OperationalIncident } from '../domain/operational-incident.entity';
import { SystemHealth } from '../domain/system-health.entity';
import { TenantOverride } from '../domain/tenant-override.entity';
import { IncidentStatusEnum } from '../domain/value-objects';
import {
  IAdminRepository,
  IncidentQueryOptions,
  WebhookQueryOptions,
  ApiKeyQueryOptions,
  PaginatedResult,
} from './admin-repository.interface';
import { AdminMapper } from './admin.mapper';

@Injectable()
export class DrizzleAdminRepository implements IAdminRepository {
  // ---- Dashboards ----

  async saveDashboard(dashboard: AdminDashboard, tenantId: string): Promise<void> {
    const raw = {
      id: dashboard.id,
      tenantId,
      dashboardName: dashboard.dashboardName,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      defaultView: dashboard.defaultView,
      permissions: dashboard.permissions,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminDashboards.id })
      .from(schema.adminDashboards)
      .where(
        and(
          eq(schema.adminDashboards.id, dashboard.id),
          eq(schema.adminDashboards.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.adminDashboards)
        .set(raw)
        .where(
          and(
            eq(schema.adminDashboards.id, dashboard.id),
            eq(schema.adminDashboards.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.adminDashboards)
        .values({ ...raw, createdAt: dashboard.createdAt });
    }
  }

  async getDashboard(tenantId: string, id: string): Promise<AdminDashboard | null> {
    const [row] = await db
      .select()
      .from(schema.adminDashboards)
      .where(
        and(
          eq(schema.adminDashboards.tenantId, tenantId),
          eq(schema.adminDashboards.id, id),
        ),
      );
    if (!row) return null;
    return AdminMapper.dashboardToDomain(row);
  }

  async getDashboardByName(
    tenantId: string,
    name: string,
  ): Promise<AdminDashboard | null> {
    const [row] = await db
      .select()
      .from(schema.adminDashboards)
      .where(
        and(
          eq(schema.adminDashboards.tenantId, tenantId),
          eq(schema.adminDashboards.dashboardName, name),
        ),
      );
    if (!row) return null;
    return AdminMapper.dashboardToDomain(row);
  }

  async listDashboards(tenantId: string): Promise<AdminDashboard[]> {
    const rows = await db
      .select()
      .from(schema.adminDashboards)
      .where(eq(schema.adminDashboards.tenantId, tenantId))
      .orderBy(asc(schema.adminDashboards.dashboardName));
    return rows.map((r) => AdminMapper.dashboardToDomain(r));
  }

  async getDefaultDashboard(tenantId: string): Promise<AdminDashboard | null> {
    const [row] = await db
      .select()
      .from(schema.adminDashboards)
      .where(
        and(
          eq(schema.adminDashboards.tenantId, tenantId),
          eq(schema.adminDashboards.defaultView, true),
        ),
      );
    if (!row) return null;
    return AdminMapper.dashboardToDomain(row);
  }

  async clearDefaultDashboards(tenantId: string, exceptId?: string): Promise<void> {
    const conditions = [
      eq(schema.adminDashboards.tenantId, tenantId),
      eq(schema.adminDashboards.defaultView, true),
    ];
    if (exceptId) conditions.push(ne(schema.adminDashboards.id, exceptId));
    await db
      .update(schema.adminDashboards)
      .set({ defaultView: false, updatedAt: new Date() })
      .where(and(...conditions));
  }

  async deleteDashboard(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminDashboards)
      .where(
        and(
          eq(schema.adminDashboards.tenantId, tenantId),
          eq(schema.adminDashboards.id, id),
        ),
      )
      .returning({ id: schema.adminDashboards.id });
    return result.length > 0;
  }

  // ---- Widgets ----

  async saveWidget(widget: AdminWidget, tenantId: string): Promise<void> {
    const raw = {
      id: widget.id,
      tenantId,
      dashboardId: widget.dashboardId,
      widgetType: widget.widgetType.value,
      title: widget.title,
      position: widget.position || null,
      configuration: widget.configuration || null,
      refreshIntervalSeconds: widget.refreshIntervalSeconds,
      isEnabled: widget.isEnabled,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminWidgets.id })
      .from(schema.adminWidgets)
      .where(
        and(
          eq(schema.adminWidgets.id, widget.id),
          eq(schema.adminWidgets.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.adminWidgets)
        .set(raw)
        .where(
          and(
            eq(schema.adminWidgets.id, widget.id),
            eq(schema.adminWidgets.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.adminWidgets).values({ ...raw, createdAt: widget.createdAt });
    }
  }

  async getWidget(tenantId: string, id: string): Promise<AdminWidget | null> {
    const [row] = await db
      .select()
      .from(schema.adminWidgets)
      .where(
        and(eq(schema.adminWidgets.tenantId, tenantId), eq(schema.adminWidgets.id, id)),
      );
    if (!row) return null;
    return AdminMapper.widgetToDomain(row);
  }

  async listWidgets(tenantId: string, dashboardId: string): Promise<AdminWidget[]> {
    const rows = await db
      .select()
      .from(schema.adminWidgets)
      .where(
        and(
          eq(schema.adminWidgets.tenantId, tenantId),
          eq(schema.adminWidgets.dashboardId, dashboardId),
        ),
      );
    return rows.map((r) => AdminMapper.widgetToDomain(r));
  }

  async deleteWidget(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminWidgets)
      .where(
        and(eq(schema.adminWidgets.tenantId, tenantId), eq(schema.adminWidgets.id, id)),
      )
      .returning({ id: schema.adminWidgets.id });
    return result.length > 0;
  }

  // ---- Announcements ----

  async saveAnnouncement(announcement: Announcement, tenantId: string): Promise<void> {
    const raw = {
      id: announcement.id,
      tenantId,
      title: announcement.title,
      message: announcement.message,
      severity: announcement.severity,
      audience: announcement.audience,
      isActive: announcement.isActive,
      startsAt: announcement.startsAt,
      endsAt: announcement.endsAt || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminAnnouncements.id })
      .from(schema.adminAnnouncements)
      .where(
        and(
          eq(schema.adminAnnouncements.id, announcement.id),
          eq(schema.adminAnnouncements.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.adminAnnouncements)
        .set(raw)
        .where(
          and(
            eq(schema.adminAnnouncements.id, announcement.id),
            eq(schema.adminAnnouncements.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.adminAnnouncements)
        .values({ ...raw, createdAt: announcement.createdAt });
    }
  }

  async getAnnouncement(tenantId: string, id: string): Promise<Announcement | null> {
    const [row] = await db
      .select()
      .from(schema.adminAnnouncements)
      .where(
        and(
          eq(schema.adminAnnouncements.tenantId, tenantId),
          eq(schema.adminAnnouncements.id, id),
        ),
      );
    if (!row) return null;
    return AdminMapper.announcementToDomain(row);
  }

  async listAnnouncements(tenantId: string): Promise<Announcement[]> {
    const rows = await db
      .select()
      .from(schema.adminAnnouncements)
      .where(eq(schema.adminAnnouncements.tenantId, tenantId))
      .orderBy(desc(schema.adminAnnouncements.startsAt));
    return rows.map((r) => AdminMapper.announcementToDomain(r));
  }

  async listActiveAnnouncements(tenantId: string, at: Date): Promise<Announcement[]> {
    const rows = await db
      .select()
      .from(schema.adminAnnouncements)
      .where(
        and(
          eq(schema.adminAnnouncements.tenantId, tenantId),
          eq(schema.adminAnnouncements.isActive, true),
          lte(schema.adminAnnouncements.startsAt, at),
        ),
      )
      .orderBy(desc(schema.adminAnnouncements.startsAt));
    return rows
      .map((r) => AdminMapper.announcementToDomain(r))
      .filter((a) => a.isCurrentlyVisible(at));
  }

  async deleteAnnouncement(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminAnnouncements)
      .where(
        and(
          eq(schema.adminAnnouncements.tenantId, tenantId),
          eq(schema.adminAnnouncements.id, id),
        ),
      )
      .returning({ id: schema.adminAnnouncements.id });
    return result.length > 0;
  }

  // ---- Audit views ----

  async saveAuditView(view: AuditView, tenantId: string): Promise<void> {
    const raw = {
      id: view.id,
      tenantId,
      userId: view.userId,
      name: view.name,
      filterDefinition: view.filterDefinition,
      isShared: view.isShared,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminAuditViews.id })
      .from(schema.adminAuditViews)
      .where(
        and(
          eq(schema.adminAuditViews.id, view.id),
          eq(schema.adminAuditViews.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.adminAuditViews)
        .set(raw)
        .where(
          and(
            eq(schema.adminAuditViews.id, view.id),
            eq(schema.adminAuditViews.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.adminAuditViews).values({ ...raw, createdAt: view.createdAt });
    }
  }

  async getAuditView(tenantId: string, id: string): Promise<AuditView | null> {
    const [row] = await db
      .select()
      .from(schema.adminAuditViews)
      .where(
        and(eq(schema.adminAuditViews.tenantId, tenantId), eq(schema.adminAuditViews.id, id)),
      );
    if (!row) return null;
    return AdminMapper.auditViewToDomain(row);
  }

  async listAuditViews(tenantId: string, userId: string): Promise<AuditView[]> {
    const rows = await db
      .select()
      .from(schema.adminAuditViews)
      .where(
        and(
          eq(schema.adminAuditViews.tenantId, tenantId),
          eq(schema.adminAuditViews.userId, userId),
        ),
      )
      .orderBy(asc(schema.adminAuditViews.name));
    return rows.map((r) => AdminMapper.auditViewToDomain(r));
  }

  async deleteAuditView(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminAuditViews)
      .where(
        and(eq(schema.adminAuditViews.tenantId, tenantId), eq(schema.adminAuditViews.id, id)),
      )
      .returning({ id: schema.adminAuditViews.id });
    return result.length > 0;
  }

  // ---- Feature access ----

  async saveFeatureAccess(access: FeatureAccess, tenantId: string): Promise<void> {
    const raw = {
      id: access.id,
      tenantId,
      featureKey: access.featureKey,
      isEnabled: access.isEnabled,
      plan: access.plan || null,
      grantedBy: access.grantedBy || null,
      notes: access.notes || null,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.adminFeatureAccess)
      .values({ ...raw, createdAt: access.createdAt })
      .onConflictDoUpdate({
        target: [schema.adminFeatureAccess.tenantId, schema.adminFeatureAccess.featureKey],
        set: raw,
      });
  }

  async getFeatureAccess(
    tenantId: string,
    featureKey: string,
  ): Promise<FeatureAccess | null> {
    const [row] = await db
      .select()
      .from(schema.adminFeatureAccess)
      .where(
        and(
          eq(schema.adminFeatureAccess.tenantId, tenantId),
          eq(schema.adminFeatureAccess.featureKey, featureKey),
        ),
      );
    if (!row) return null;
    return AdminMapper.featureAccessToDomain(row);
  }

  async listFeatureAccess(tenantId: string): Promise<FeatureAccess[]> {
    const rows = await db
      .select()
      .from(schema.adminFeatureAccess)
      .where(eq(schema.adminFeatureAccess.tenantId, tenantId))
      .orderBy(asc(schema.adminFeatureAccess.featureKey));
    return rows.map((r) => AdminMapper.featureAccessToDomain(r));
  }

  // ---- API keys ----

  async saveApiKey(apiKey: ApiKey, tenantId: string): Promise<void> {
    const raw = {
      id: apiKey.id,
      tenantId,
      name: apiKey.name,
      keyHash: apiKey.keyHash,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      expiresAt: apiKey.expiresAt || null,
      lastUsedAt: apiKey.lastUsedAt || null,
      status: apiKey.status.value,
      revokedAt: apiKey.revokedAt || null,
      usageCount: apiKey.usageCount,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminApiKeys.id })
      .from(schema.adminApiKeys)
      .where(
        and(eq(schema.adminApiKeys.id, apiKey.id), eq(schema.adminApiKeys.tenantId, tenantId)),
      );
    if (existing) {
      await db
        .update(schema.adminApiKeys)
        .set(raw)
        .where(
          and(
            eq(schema.adminApiKeys.id, apiKey.id),
            eq(schema.adminApiKeys.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.adminApiKeys)
        .values({ ...raw, createdBy: apiKey.createdBy || null, createdAt: apiKey.createdAt });
    }
  }

  async getApiKey(tenantId: string, id: string): Promise<ApiKey | null> {
    const [row] = await db
      .select()
      .from(schema.adminApiKeys)
      .where(and(eq(schema.adminApiKeys.tenantId, tenantId), eq(schema.adminApiKeys.id, id)));
    if (!row) return null;
    return AdminMapper.apiKeyToDomain(row);
  }

  async getApiKeyByHash(
    keyHash: string,
  ): Promise<{ apiKey: ApiKey; tenantId: string } | null> {
    const [row] = await db
      .select()
      .from(schema.adminApiKeys)
      .where(eq(schema.adminApiKeys.keyHash, keyHash));
    if (!row) return null;
    return { apiKey: AdminMapper.apiKeyToDomain(row), tenantId: row.tenantId };
  }

  async listApiKeys(
    tenantId: string,
    options: ApiKeyQueryOptions = {},
  ): Promise<PaginatedResult<ApiKey>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.adminApiKeys.tenantId, tenantId)];
    if (options.status) conditions.push(eq(schema.adminApiKeys.status, options.status));

    const rows = await db
      .select()
      .from(schema.adminApiKeys)
      .where(and(...conditions))
      .orderBy(desc(schema.adminApiKeys.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.adminApiKeys)
      .where(and(...conditions));
    return {
      data: rows.map((r) => AdminMapper.apiKeyToDomain(r)),
      total: Number(count),
    };
  }

  // ---- Webhooks ----

  async saveWebhook(webhook: Webhook, tenantId: string): Promise<void> {
    const raw = {
      id: webhook.id,
      tenantId,
      name: webhook.name,
      url: webhook.url,
      secretEncrypted: webhook.secretEncrypted,
      events: webhook.events,
      retryPolicy: webhook.retryPolicy,
      status: webhook.status.value,
      lastDeliveryAt: webhook.lastDeliveryAt || null,
      lastDeliveryStatus: webhook.lastDeliveryStatus || null,
      consecutiveFailures: webhook.consecutiveFailures,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminWebhooks.id })
      .from(schema.adminWebhooks)
      .where(
        and(eq(schema.adminWebhooks.id, webhook.id), eq(schema.adminWebhooks.tenantId, tenantId)),
      );
    if (existing) {
      await db
        .update(schema.adminWebhooks)
        .set(raw)
        .where(
          and(
            eq(schema.adminWebhooks.id, webhook.id),
            eq(schema.adminWebhooks.tenantId, tenantId),
          ),
        );
    } else {
      await db.insert(schema.adminWebhooks).values({ ...raw, createdAt: webhook.createdAt });
    }
  }

  async getWebhook(tenantId: string, id: string): Promise<Webhook | null> {
    const [row] = await db
      .select()
      .from(schema.adminWebhooks)
      .where(and(eq(schema.adminWebhooks.tenantId, tenantId), eq(schema.adminWebhooks.id, id)));
    if (!row) return null;
    return AdminMapper.webhookToDomain(row);
  }

  async listWebhooks(
    tenantId: string,
    options: WebhookQueryOptions = {},
  ): Promise<PaginatedResult<Webhook>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.adminWebhooks.tenantId, tenantId)];
    if (options.status) conditions.push(eq(schema.adminWebhooks.status, options.status));

    const rows = await db
      .select()
      .from(schema.adminWebhooks)
      .where(and(...conditions))
      .orderBy(desc(schema.adminWebhooks.createdAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.adminWebhooks)
      .where(and(...conditions));
    return {
      data: rows.map((r) => AdminMapper.webhookToDomain(r)),
      total: Number(count),
    };
  }

  async findWebhooksForEvent(tenantId: string, eventName: string): Promise<Webhook[]> {
    const rows = await db
      .select()
      .from(schema.adminWebhooks)
      .where(
        and(
          eq(schema.adminWebhooks.tenantId, tenantId),
          eq(schema.adminWebhooks.status, 'ACTIVE'),
          sql`${schema.adminWebhooks.events} @> ${JSON.stringify([eventName])}::jsonb`,
        ),
      );
    return rows.map((r) => AdminMapper.webhookToDomain(r));
  }

  async deleteWebhook(tenantId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminWebhooks)
      .where(and(eq(schema.adminWebhooks.tenantId, tenantId), eq(schema.adminWebhooks.id, id)))
      .returning({ id: schema.adminWebhooks.id });
    return result.length > 0;
  }

  // ---- Operational incidents ----

  async saveIncident(incident: OperationalIncident, tenantId: string): Promise<void> {
    const raw = {
      id: incident.id,
      tenantId,
      title: incident.title,
      severity: incident.severity,
      status: incident.status.value,
      affectedService: incident.affectedService,
      description: incident.description || null,
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt || null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: schema.adminOperationalIncidents.id })
      .from(schema.adminOperationalIncidents)
      .where(
        and(
          eq(schema.adminOperationalIncidents.id, incident.id),
          eq(schema.adminOperationalIncidents.tenantId, tenantId),
        ),
      );
    if (existing) {
      await db
        .update(schema.adminOperationalIncidents)
        .set(raw)
        .where(
          and(
            eq(schema.adminOperationalIncidents.id, incident.id),
            eq(schema.adminOperationalIncidents.tenantId, tenantId),
          ),
        );
    } else {
      await db
        .insert(schema.adminOperationalIncidents)
        .values({ ...raw, createdAt: incident.createdAt });
    }
  }

  async getIncident(tenantId: string, id: string): Promise<OperationalIncident | null> {
    const [row] = await db
      .select()
      .from(schema.adminOperationalIncidents)
      .where(
        and(
          eq(schema.adminOperationalIncidents.tenantId, tenantId),
          eq(schema.adminOperationalIncidents.id, id),
        ),
      );
    if (!row) return null;
    return AdminMapper.incidentToDomain(row);
  }

  async listIncidents(
    tenantId: string,
    options: IncidentQueryOptions = {},
  ): Promise<PaginatedResult<OperationalIncident>> {
    const limit = options.limit || 25;
    const page = options.page || 1;
    const offset = (page - 1) * limit;
    const conditions = [eq(schema.adminOperationalIncidents.tenantId, tenantId)];
    if (options.status)
      conditions.push(eq(schema.adminOperationalIncidents.status, options.status));
    if (options.severity)
      conditions.push(eq(schema.adminOperationalIncidents.severity, options.severity));
    if (options.affectedService)
      conditions.push(
        eq(schema.adminOperationalIncidents.affectedService, options.affectedService),
      );

    const rows = await db
      .select()
      .from(schema.adminOperationalIncidents)
      .where(and(...conditions))
      .orderBy(desc(schema.adminOperationalIncidents.startedAt))
      .limit(limit)
      .offset(offset);
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.adminOperationalIncidents)
      .where(and(...conditions));
    return {
      data: rows.map((r) => AdminMapper.incidentToDomain(r)),
      total: Number(count),
    };
  }

  async findOpenIncidentByService(
    tenantId: string,
    affectedService: string,
  ): Promise<OperationalIncident | null> {
    const [row] = await db
      .select()
      .from(schema.adminOperationalIncidents)
      .where(
        and(
          eq(schema.adminOperationalIncidents.tenantId, tenantId),
          eq(schema.adminOperationalIncidents.affectedService, affectedService),
          ne(schema.adminOperationalIncidents.status, IncidentStatusEnum.RESOLVED),
        ),
      )
      .orderBy(desc(schema.adminOperationalIncidents.startedAt));
    if (!row) return null;
    return AdminMapper.incidentToDomain(row);
  }

  // ---- System health ----

  async upsertSystemHealth(health: SystemHealth, tenantId: string): Promise<void> {
    const raw = {
      id: health.id,
      tenantId,
      serviceName: health.serviceName,
      status: health.status.value,
      latencyMs: health.latencyMs ?? null,
      errorRate: health.errorRate ?? null,
      lastCheckAt: health.lastCheckAt,
      metadata: health.metadata,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.adminSystemHealth)
      .values({ ...raw, createdAt: health.createdAt })
      .onConflictDoUpdate({
        target: [schema.adminSystemHealth.tenantId, schema.adminSystemHealth.serviceName],
        set: raw,
      });
  }

  async getSystemHealth(
    tenantId: string,
    serviceName: string,
  ): Promise<SystemHealth | null> {
    const [row] = await db
      .select()
      .from(schema.adminSystemHealth)
      .where(
        and(
          eq(schema.adminSystemHealth.tenantId, tenantId),
          eq(schema.adminSystemHealth.serviceName, serviceName),
        ),
      );
    if (!row) return null;
    return AdminMapper.systemHealthToDomain(row);
  }

  async listSystemHealth(tenantId: string): Promise<SystemHealth[]> {
    const rows = await db
      .select()
      .from(schema.adminSystemHealth)
      .where(eq(schema.adminSystemHealth.tenantId, tenantId))
      .orderBy(asc(schema.adminSystemHealth.serviceName));
    return rows.map((r) => AdminMapper.systemHealthToDomain(r));
  }

  // ---- Tenant overrides ----

  async saveOverride(override: TenantOverride, tenantId: string): Promise<void> {
    const raw = {
      id: override.id,
      tenantId,
      featureKey: override.featureKey,
      overrideValue: override.overrideValue,
      reason: override.reason,
      expiresAt: override.expiresAt || null,
      updatedAt: new Date(),
    };
    await db
      .insert(schema.adminTenantOverrides)
      .values({ ...raw, createdBy: override.createdBy || null, createdAt: override.createdAt })
      .onConflictDoUpdate({
        target: [schema.adminTenantOverrides.tenantId, schema.adminTenantOverrides.featureKey],
        set: raw,
      });
  }

  async getOverride(
    tenantId: string,
    featureKey: string,
  ): Promise<TenantOverride | null> {
    const [row] = await db
      .select()
      .from(schema.adminTenantOverrides)
      .where(
        and(
          eq(schema.adminTenantOverrides.tenantId, tenantId),
          eq(schema.adminTenantOverrides.featureKey, featureKey),
        ),
      );
    if (!row) return null;
    return AdminMapper.overrideToDomain(row);
  }

  async listOverrides(tenantId: string): Promise<TenantOverride[]> {
    const rows = await db
      .select()
      .from(schema.adminTenantOverrides)
      .where(eq(schema.adminTenantOverrides.tenantId, tenantId))
      .orderBy(asc(schema.adminTenantOverrides.featureKey));
    return rows.map((r) => AdminMapper.overrideToDomain(r));
  }

  async deleteOverride(tenantId: string, featureKey: string): Promise<boolean> {
    const result = await db
      .delete(schema.adminTenantOverrides)
      .where(
        and(
          eq(schema.adminTenantOverrides.tenantId, tenantId),
          eq(schema.adminTenantOverrides.featureKey, featureKey),
        ),
      )
      .returning({ id: schema.adminTenantOverrides.id });
    return result.length > 0;
  }

  async findExpiredOverrides(now: Date, limit: number): Promise<TenantOverride[]> {
    const rows = await db
      .select()
      .from(schema.adminTenantOverrides)
      .where(lte(schema.adminTenantOverrides.expiresAt, now))
      .orderBy(asc(schema.adminTenantOverrides.expiresAt))
      .limit(limit);
    return rows.map((r) => AdminMapper.overrideToDomain(r));
  }
}
