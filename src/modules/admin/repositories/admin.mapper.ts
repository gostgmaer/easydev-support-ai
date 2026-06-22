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
import {
  AdminWidgetType,
  AdminWidgetTypeEnum,
  ApiKeyStatus,
  ApiKeyStatusEnum,
  WebhookStatus,
  WebhookStatusEnum,
  IncidentStatus,
  IncidentStatusEnum,
  IncidentSeverityEnum,
  SystemHealthStatus,
  SystemHealthStatusEnum,
  AnnouncementSeverityEnum,
} from '../domain/value-objects';

export class AdminMapper {
  public static dashboardToDomain(raw: any): AdminDashboard {
    return new AdminDashboard(raw.id, {
      tenantId: raw.tenantId,
      dashboardName: raw.dashboardName,
      layout: (raw.layout as Record<string, any>) || {},
      widgets: (raw.widgets as Record<string, any>) || {},
      defaultView: raw.defaultView ?? false,
      permissions: (raw.permissions as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt || undefined,
      version: raw.version || 1,
    });
  }

  public static widgetToDomain(raw: any): AdminWidget {
    return new AdminWidget(raw.id, {
      tenantId: raw.tenantId,
      dashboardId: raw.dashboardId,
      widgetType: AdminWidgetType.create(raw.widgetType as AdminWidgetTypeEnum),
      title: raw.title,
      position: (raw.position as Record<string, any>) || undefined,
      configuration: (raw.configuration as Record<string, any>) || undefined,
      refreshIntervalSeconds: raw.refreshIntervalSeconds ?? 60,
      isEnabled: raw.isEnabled ?? true,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static announcementToDomain(raw: any): Announcement {
    return new Announcement(raw.id, {
      tenantId: raw.tenantId,
      title: raw.title,
      message: raw.message,
      severity: raw.severity as AnnouncementSeverityEnum,
      audience: raw.audience,
      isActive: raw.isActive ?? true,
      startsAt: raw.startsAt,
      endsAt: raw.endsAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static auditViewToDomain(raw: any): AuditView {
    return new AuditView(raw.id, {
      tenantId: raw.tenantId,
      userId: raw.userId,
      name: raw.name,
      filterDefinition: (raw.filterDefinition as Record<string, any>) || {},
      isShared: raw.isShared ?? false,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static featureAccessToDomain(raw: any): FeatureAccess {
    return new FeatureAccess(raw.id, {
      tenantId: raw.tenantId,
      featureKey: raw.featureKey,
      isEnabled: raw.isEnabled ?? true,
      plan: raw.plan || undefined,
      grantedBy: raw.grantedBy || undefined,
      notes: raw.notes || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static apiKeyToDomain(raw: any): ApiKey {
    return new ApiKey(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      keyHash: raw.keyHash,
      keyPrefix: raw.keyPrefix,
      scopes: (raw.scopes as string[]) || [],
      status: ApiKeyStatus.create(raw.status as ApiKeyStatusEnum),
      expiresAt: raw.expiresAt || undefined,
      lastUsedAt: raw.lastUsedAt || undefined,
      revokedAt: raw.revokedAt || undefined,
      usageCount: raw.usageCount ?? 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      createdBy: raw.createdBy || undefined,
      version: raw.version || 1,
    });
  }

  public static webhookToDomain(raw: any): Webhook {
    return new Webhook(raw.id, {
      tenantId: raw.tenantId,
      name: raw.name,
      url: raw.url,
      secretEncrypted: raw.secretEncrypted,
      events: (raw.events as string[]) || [],
      status: WebhookStatus.create(raw.status as WebhookStatusEnum),
      retryPolicy:
        (raw.retryPolicy as { maxAttempts: number; backoffMs: number }) ||
        undefined,
      lastDeliveryAt: raw.lastDeliveryAt || undefined,
      lastDeliveryStatus: raw.lastDeliveryStatus || undefined,
      consecutiveFailures: raw.consecutiveFailures ?? 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static incidentToDomain(raw: any): OperationalIncident {
    return new OperationalIncident(raw.id, {
      tenantId: raw.tenantId,
      title: raw.title,
      severity: raw.severity as IncidentSeverityEnum,
      status: IncidentStatus.create(raw.status as IncidentStatusEnum),
      affectedService: raw.affectedService,
      description: raw.description || undefined,
      startedAt: raw.startedAt,
      resolvedAt: raw.resolvedAt || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static systemHealthToDomain(raw: any): SystemHealth {
    return new SystemHealth(raw.id, {
      tenantId: raw.tenantId,
      serviceName: raw.serviceName,
      status: SystemHealthStatus.create(raw.status as SystemHealthStatusEnum),
      latencyMs: raw.latencyMs ?? undefined,
      errorRate: raw.errorRate ?? undefined,
      lastCheckAt: raw.lastCheckAt,
      metadata: (raw.metadata as Record<string, any>) || {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }

  public static overrideToDomain(raw: any): TenantOverride {
    return new TenantOverride(raw.id, {
      tenantId: raw.tenantId,
      featureKey: raw.featureKey,
      overrideValue: raw.overrideValue,
      reason: raw.reason,
      expiresAt: raw.expiresAt || undefined,
      createdBy: raw.createdBy || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version || 1,
    });
  }
}
