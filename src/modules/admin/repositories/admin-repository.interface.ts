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

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IncidentQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  affectedService?: string;
}

export interface WebhookQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface ApiKeyQueryOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface IAdminRepository {
  // Dashboards
  saveDashboard(dashboard: AdminDashboard, tenantId: string): Promise<void>;
  getDashboard(tenantId: string, id: string): Promise<AdminDashboard | null>;
  getDashboardByName(
    tenantId: string,
    name: string,
  ): Promise<AdminDashboard | null>;
  listDashboards(tenantId: string): Promise<AdminDashboard[]>;
  getDefaultDashboard(tenantId: string): Promise<AdminDashboard | null>;
  clearDefaultDashboards(tenantId: string, exceptId?: string): Promise<void>;
  deleteDashboard(tenantId: string, id: string): Promise<boolean>;

  // Widgets
  saveWidget(widget: AdminWidget, tenantId: string): Promise<void>;
  getWidget(tenantId: string, id: string): Promise<AdminWidget | null>;
  listWidgets(tenantId: string, dashboardId: string): Promise<AdminWidget[]>;
  deleteWidget(tenantId: string, id: string): Promise<boolean>;

  // Announcements
  saveAnnouncement(announcement: Announcement, tenantId: string): Promise<void>;
  getAnnouncement(tenantId: string, id: string): Promise<Announcement | null>;
  listAnnouncements(tenantId: string): Promise<Announcement[]>;
  listActiveAnnouncements(tenantId: string, at: Date): Promise<Announcement[]>;
  deleteAnnouncement(tenantId: string, id: string): Promise<boolean>;

  // Audit views
  saveAuditView(view: AuditView, tenantId: string): Promise<void>;
  getAuditView(tenantId: string, id: string): Promise<AuditView | null>;
  listAuditViews(tenantId: string, userId: string): Promise<AuditView[]>;
  deleteAuditView(tenantId: string, id: string): Promise<boolean>;

  // Feature access
  saveFeatureAccess(access: FeatureAccess, tenantId: string): Promise<void>;
  getFeatureAccess(
    tenantId: string,
    featureKey: string,
  ): Promise<FeatureAccess | null>;
  listFeatureAccess(tenantId: string): Promise<FeatureAccess[]>;

  // API keys
  saveApiKey(apiKey: ApiKey, tenantId: string): Promise<void>;
  getApiKey(tenantId: string, id: string): Promise<ApiKey | null>;
  getApiKeyByHash(
    keyHash: string,
  ): Promise<{ apiKey: ApiKey; tenantId: string } | null>;
  listApiKeys(
    tenantId: string,
    options?: ApiKeyQueryOptions,
  ): Promise<PaginatedResult<ApiKey>>;

  // Webhooks
  saveWebhook(webhook: Webhook, tenantId: string): Promise<void>;
  getWebhook(tenantId: string, id: string): Promise<Webhook | null>;
  listWebhooks(
    tenantId: string,
    options?: WebhookQueryOptions,
  ): Promise<PaginatedResult<Webhook>>;
  findWebhooksForEvent(tenantId: string, eventName: string): Promise<Webhook[]>;
  deleteWebhook(tenantId: string, id: string): Promise<boolean>;

  // Operational incidents
  saveIncident(incident: OperationalIncident, tenantId: string): Promise<void>;
  getIncident(
    tenantId: string,
    id: string,
  ): Promise<OperationalIncident | null>;
  listIncidents(
    tenantId: string,
    options?: IncidentQueryOptions,
  ): Promise<PaginatedResult<OperationalIncident>>;
  findOpenIncidentByService(
    tenantId: string,
    affectedService: string,
  ): Promise<OperationalIncident | null>;

  // System health
  upsertSystemHealth(health: SystemHealth, tenantId: string): Promise<void>;
  getSystemHealth(
    tenantId: string,
    serviceName: string,
  ): Promise<SystemHealth | null>;
  listSystemHealth(tenantId: string): Promise<SystemHealth[]>;

  // Tenant overrides
  saveOverride(override: TenantOverride, tenantId: string): Promise<void>;
  getOverride(
    tenantId: string,
    featureKey: string,
  ): Promise<TenantOverride | null>;
  listOverrides(tenantId: string): Promise<TenantOverride[]>;
  deleteOverride(tenantId: string, featureKey: string): Promise<boolean>;
  findExpiredOverrides(now: Date, limit: number): Promise<TenantOverride[]>;
}
