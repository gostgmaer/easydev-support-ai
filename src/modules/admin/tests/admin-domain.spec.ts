import { randomUUID } from 'crypto';
import { AdminDashboard } from '../domain/admin-dashboard.aggregate';
import { AdminWidget } from '../domain/admin-widget.entity';
import { ApiKey } from '../domain/api-key.entity';
import { Webhook } from '../domain/webhook.entity';
import { OperationalIncident } from '../domain/operational-incident.entity';
import { SystemHealth } from '../domain/system-health.entity';
import { TenantOverride } from '../domain/tenant-override.entity';
import { Announcement } from '../domain/announcement.entity';
import { FeatureAccess } from '../domain/feature-access.entity';
import { AuditView } from '../domain/audit-view.entity';
import {
  AdminWidgetTypeEnum,
  ApiKeyStatus,
  ApiKeyStatusEnum,
  WebhookStatusEnum,
  IncidentSeverityEnum,
  IncidentStatus,
  IncidentStatusEnum,
  SystemHealthStatus,
  SystemHealthStatusEnum,
  AnnouncementSeverityEnum,
} from '../domain/value-objects';

describe('AdminDashboard aggregate', () => {
  const tenantId = randomUUID();

  it('emits admin.dashboard.updated on creation', () => {
    const dashboard = AdminDashboard.create(randomUUID(), {
      tenantId,
      dashboardName: 'Overview',
    });
    expect(dashboard.domainEvents).toHaveLength(1);
    expect(
      (dashboard.domainEvents[0].constructor as { eventName?: string })
        .eventName,
    ).toBe('admin.dashboard.updated');
  });

  it('renames, updates layout/widgets/permissions and bumps version', () => {
    const dashboard = AdminDashboard.create(randomUUID(), {
      tenantId,
      dashboardName: 'Overview',
    });
    dashboard.clearEvents();
    const startVersion = dashboard.version;

    dashboard.rename('Renamed');
    expect(dashboard.dashboardName).toBe('Renamed');

    dashboard.updateLayout({ columns: 3 });
    expect(dashboard.layout).toEqual({ columns: 3 });

    dashboard.updateWidgets({ widgetIds: ['a'] });
    expect(dashboard.widgets).toEqual({ widgetIds: ['a'] });

    dashboard.updatePermissions({ roles: ['tenant_admin'] });
    expect(dashboard.permissions).toEqual({ roles: ['tenant_admin'] });

    expect(dashboard.version).toBeGreaterThan(startVersion);
    expect(dashboard.domainEvents.length).toBeGreaterThan(0);
  });

  it('toggles default view', () => {
    const dashboard = AdminDashboard.create(randomUUID(), {
      tenantId,
      dashboardName: 'Overview',
    });
    dashboard.setAsDefault();
    expect(dashboard.defaultView).toBe(true);
    dashboard.unsetDefault();
    expect(dashboard.defaultView).toBe(false);
  });
});

describe('AdminWidget entity', () => {
  it('creates with defaults and validates refresh interval', () => {
    const widget = AdminWidget.create(randomUUID(), {
      tenantId: randomUUID(),
      dashboardId: randomUUID(),
      widgetType: AdminWidgetTypeEnum.CONVERSATION_METRICS,
      title: 'Conversations',
    });
    expect(widget.refreshIntervalSeconds).toBe(60);
    expect(widget.isEnabled).toBe(true);
    expect(() => widget.setRefreshInterval(1)).toThrow();
    widget.setRefreshInterval(30);
    expect(widget.refreshIntervalSeconds).toBe(30);
  });

  it('repositions, configures and toggles enablement', () => {
    const widget = AdminWidget.create(randomUUID(), {
      tenantId: randomUUID(),
      dashboardId: randomUUID(),
      widgetType: AdminWidgetTypeEnum.SYSTEM_HEALTH,
      title: 'Health',
    });
    widget.reposition({ x: 1, y: 2 });
    expect(widget.position).toEqual({ x: 1, y: 2 });
    widget.configure({ refresh: true });
    expect(widget.configuration).toEqual({ refresh: true });
    widget.disable();
    expect(widget.isEnabled).toBe(false);
    widget.enable();
    expect(widget.isEnabled).toBe(true);
  });
});

describe('ApiKey entity', () => {
  it('creates active with usable scopes', () => {
    const key = ApiKey.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'CI key',
      keyHash: 'hash',
      keyPrefix: 'eda_ab12',
      scopes: ['dashboards:read'],
    });
    expect(key.status.value).toBe(ApiKeyStatusEnum.ACTIVE);
    expect(key.isUsable()).toBe(true);
    expect(key.hasScope('dashboards:read')).toBe(true);
    expect(key.hasScope('webhooks:write')).toBe(false);
  });

  it('treats a wildcard scope as matching anything', () => {
    const key = ApiKey.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'Full access',
      keyHash: 'hash',
      keyPrefix: 'eda_cd34',
      scopes: ['*'],
    });
    expect(key.hasScope('anything:here')).toBe(true);
  });

  it('records usage and revokes', () => {
    const key = ApiKey.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'CI key',
      keyHash: 'hash',
      keyPrefix: 'eda_ab12',
      scopes: ['*'],
    });
    key.recordUsage();
    expect(key.usageCount).toBe(1);
    expect(key.lastUsedAt).toBeInstanceOf(Date);

    key.revoke();
    expect(key.status.value).toBe(ApiKeyStatusEnum.REVOKED);
    expect(key.isUsable()).toBe(false);
    expect(key.revokedAt).toBeInstanceOf(Date);
  });

  it('treats a past expiry date as expired and unusable', () => {
    const key = ApiKey.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'Expiring key',
      keyHash: 'hash',
      keyPrefix: 'eda_ef56',
      scopes: ['*'],
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(key.isExpired()).toBe(true);
    expect(key.isUsable()).toBe(false);
  });

  it('rejects an invalid status value', () => {
    expect(() => ApiKeyStatus.create('BOGUS' as ApiKeyStatusEnum)).toThrow();
  });
});

describe('Webhook entity', () => {
  it('flips to FAILING after repeated delivery failures and recovers on success', () => {
    const webhook = Webhook.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'Slack notifier',
      url: 'https://example.com/hook',
      secretEncrypted: 'enc',
      events: ['admin.incident.created'],
    });
    expect(webhook.status.value).toBe(WebhookStatusEnum.ACTIVE);

    webhook.recordDeliveryFailure();
    webhook.recordDeliveryFailure();
    expect(webhook.status.value).toBe(WebhookStatusEnum.ACTIVE);
    webhook.recordDeliveryFailure();
    expect(webhook.status.value).toBe(WebhookStatusEnum.FAILING);
    expect(webhook.consecutiveFailures).toBe(3);

    webhook.recordDeliverySuccess();
    expect(webhook.status.value).toBe(WebhookStatusEnum.ACTIVE);
    expect(webhook.consecutiveFailures).toBe(0);
  });

  it('disables and re-enables', () => {
    const webhook = Webhook.create(randomUUID(), {
      tenantId: randomUUID(),
      name: 'Notifier',
      url: 'https://example.com/hook',
      secretEncrypted: 'enc',
      events: ['admin.incident.created'],
    });
    webhook.disable();
    expect(webhook.status.value).toBe(WebhookStatusEnum.DISABLED);
    webhook.enable();
    expect(webhook.status.value).toBe(WebhookStatusEnum.ACTIVE);
  });
});

describe('OperationalIncident entity', () => {
  it('opens, escalates and resolves', () => {
    const incident = OperationalIncident.create(randomUUID(), {
      tenantId: randomUUID(),
      title: 'database is down',
      severity: IncidentSeverityEnum.MEDIUM,
      affectedService: 'database',
    });
    expect(incident.status.value).toBe(IncidentStatusEnum.OPEN);

    incident.escalate(IncidentSeverityEnum.CRITICAL);
    expect(incident.severity).toBe(IncidentSeverityEnum.CRITICAL);

    incident.resolve();
    expect(incident.status.value).toBe(IncidentStatusEnum.RESOLVED);
    expect(incident.resolvedAt).toBeInstanceOf(Date);
  });

  it('reports terminal status only once resolved', () => {
    expect(IncidentStatus.create(IncidentStatusEnum.OPEN).isTerminal()).toBe(
      false,
    );
    expect(
      IncidentStatus.create(IncidentStatusEnum.RESOLVED).isTerminal(),
    ).toBe(true);
  });
});

describe('SystemHealth entity', () => {
  it('records checks and detects status transitions', () => {
    const health = SystemHealth.create(randomUUID(), {
      tenantId: randomUUID(),
      serviceName: 'database',
      status: SystemHealthStatusEnum.HEALTHY,
    });
    expect(health.hasChangedStatusSince(SystemHealthStatusEnum.DOWN)).toBe(
      true,
    );
    expect(health.hasChangedStatusSince(SystemHealthStatusEnum.HEALTHY)).toBe(
      false,
    );

    health.recordCheck(SystemHealthStatusEnum.DOWN, 5000, 1);
    expect(health.status.value).toBe(SystemHealthStatusEnum.DOWN);
    expect(health.latencyMs).toBe(5000);
  });

  it('reports operational only when not DOWN', () => {
    expect(
      SystemHealthStatus.create(
        SystemHealthStatusEnum.DEGRADED,
      ).isOperational(),
    ).toBe(true);
    expect(
      SystemHealthStatus.create(SystemHealthStatusEnum.DOWN).isOperational(),
    ).toBe(false);
  });
});

describe('TenantOverride entity', () => {
  it('detects expiry and supports updates', () => {
    const override = TenantOverride.create(randomUUID(), {
      tenantId: randomUUID(),
      featureKey: 'beta.workflows',
      overrideValue: { enabled: true },
      reason: 'Beta rollout',
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(override.isExpired()).toBe(true);

    override.update({ enabled: false }, 'Rolled back', undefined);
    expect(override.overrideValue).toEqual({ enabled: false });
    expect(override.isExpired()).toBe(false);
  });
});

describe('Announcement entity', () => {
  it('is visible only within its active window', () => {
    const announcement = Announcement.create(randomUUID(), {
      tenantId: randomUUID(),
      title: 'Maintenance',
      message: 'Scheduled maintenance tonight',
      severity: AnnouncementSeverityEnum.WARNING,
      startsAt: new Date(Date.now() - 1000),
      endsAt: new Date(Date.now() + 60000),
    });
    expect(announcement.isCurrentlyVisible()).toBe(true);
    announcement.deactivate();
    expect(announcement.isCurrentlyVisible()).toBe(false);
  });
});

describe('FeatureAccess entity', () => {
  it('grants and revokes access', () => {
    const access = FeatureAccess.create(randomUUID(), {
      tenantId: randomUUID(),
      featureKey: 'beta.inbox',
      isEnabled: false,
    });
    expect(access.isEnabled).toBe(false);
    access.grant('admin-user', 'manually enabled');
    expect(access.isEnabled).toBe(true);
    expect(access.grantedBy).toBe('admin-user');
    access.revoke('disabled for now');
    expect(access.isEnabled).toBe(false);
  });
});

describe('AuditView entity', () => {
  it('creates and updates a saved filter definition', () => {
    const view = AuditView.create(randomUUID(), {
      tenantId: randomUUID(),
      userId: randomUUID(),
      name: 'My security events',
      filterDefinition: { category: 'SECURITY' },
    });
    expect(view.isShared).toBe(false);
    view.update({ category: 'API_KEY' }, true);
    expect(view.filterDefinition).toEqual({ category: 'API_KEY' });
    expect(view.isShared).toBe(true);
  });
});
