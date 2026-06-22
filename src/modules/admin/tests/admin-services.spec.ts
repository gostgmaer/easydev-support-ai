import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { QueueService } from '@easydev/shared-queues';

import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminWidgetService } from '../services/admin-widget.service';
import { AdminApiKeyService } from '../services/admin-api-key.service';
import { AdminWebhookService } from '../services/admin-webhook.service';
import { AdminIncidentService } from '../services/admin-incident.service';
import { AdminHealthService } from '../services/admin-health.service';
import { AdminOverrideService } from '../services/admin-override.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminEventPublisher } from '../services/admin-event.publisher';
import { AdminQueueProcessor } from '../jobs/admin-queue.processor';
import { AuditService } from '../../audit/audit.service';
import { AuditRepository } from '../../audit/audit.repository';
import { WorkflowAuditService } from '../../workflows/services/workflow-audit.service';

import { OperationalIncident } from '../domain/operational-incident.entity';
import {
  IncidentSeverityEnum,
  IncidentStatusEnum,
  AdminWidgetTypeEnum,
  SystemHealthStatusEnum,
} from '../domain/value-objects';

const adminRepoFactory = () => ({
  saveDashboard: jest.fn((d) => Promise.resolve(d)),
  getDashboard: jest.fn(),
  getDashboardByName: jest.fn(),
  listDashboards: jest.fn(),
  getDefaultDashboard: jest.fn(),
  clearDefaultDashboards: jest.fn(),
  deleteDashboard: jest.fn(),
  saveWidget: jest.fn(),
  getWidget: jest.fn(),
  listWidgets: jest.fn(),
  deleteWidget: jest.fn(),
  saveAnnouncement: jest.fn(),
  getAnnouncement: jest.fn(),
  listAnnouncements: jest.fn(),
  listActiveAnnouncements: jest.fn(),
  deleteAnnouncement: jest.fn(),
  saveAuditView: jest.fn(),
  getAuditView: jest.fn(),
  listAuditViews: jest.fn(),
  deleteAuditView: jest.fn(),
  saveFeatureAccess: jest.fn(),
  getFeatureAccess: jest.fn(),
  listFeatureAccess: jest.fn(),
  saveApiKey: jest.fn(),
  getApiKey: jest.fn(),
  getApiKeyByHash: jest.fn(),
  listApiKeys: jest.fn(),
  saveWebhook: jest.fn(),
  getWebhook: jest.fn(),
  listWebhooks: jest.fn(),
  findWebhooksForEvent: jest.fn(),
  deleteWebhook: jest.fn(),
  saveIncident: jest.fn(),
  getIncident: jest.fn(),
  listIncidents: jest.fn(),
  findOpenIncidentByService: jest.fn(),
  upsertSystemHealth: jest.fn(),
  getSystemHealth: jest.fn(),
  listSystemHealth: jest.fn(),
  saveOverride: jest.fn(),
  getOverride: jest.fn(),
  listOverrides: jest.fn(),
  deleteOverride: jest.fn(),
  findExpiredOverrides: jest.fn(),
});

const publisherMock = { publish: jest.fn(), publishAll: jest.fn() };

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let repo: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: AdminEventPublisher, useValue: publisherMock },
      ],
    }).compile();
    service = module.get(AdminDashboardService);
    jest.clearAllMocks();
  });

  it('creates a dashboard and rejects a duplicate name', async () => {
    repo.getDashboardByName.mockResolvedValueOnce(null);
    const tenantId = randomUUID();
    const dashboard = await service.createDashboard(tenantId, {
      dashboardName: 'Ops',
    });
    expect(dashboard.dashboardName).toBe('Ops');
    expect(repo.saveDashboard).toHaveBeenCalled();

    repo.getDashboardByName.mockResolvedValueOnce(dashboard);
    await expect(
      service.createDashboard(tenantId, { dashboardName: 'Ops' }),
    ).rejects.toThrow(ConflictException);
  });

  it('clears other defaults when a new dashboard is set as default', async () => {
    repo.getDashboardByName.mockResolvedValue(null);
    const tenantId = randomUUID();
    await service.createDashboard(tenantId, {
      dashboardName: 'Default',
      defaultView: true,
    });
    expect(repo.clearDefaultDashboards).toHaveBeenCalledWith(tenantId);
  });

  it('creates and deactivates an announcement', async () => {
    const tenantId = randomUUID();
    const announcement = await service.createAnnouncement(tenantId, {
      title: 'Maintenance',
      message: 'Tonight',
    });
    expect(repo.saveAnnouncement).toHaveBeenCalled();

    repo.getAnnouncement.mockResolvedValue(announcement);
    const deactivated = await service.deactivateAnnouncement(
      tenantId,
      announcement.id,
    );
    expect(deactivated.isActive).toBe(false);
  });
});

describe('AdminApiKeyService', () => {
  let service: AdminApiKeyService;
  let repo: any;
  let queueService: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    queueService = { addJob: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminApiKeyService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: AdminEventPublisher, useValue: publisherMock },
        { provide: QueueService, useValue: queueService },
      ],
    }).compile();
    service = module.get(AdminApiKeyService);
    jest.clearAllMocks();
  });

  it('creates and then validates the raw key end-to-end', async () => {
    const tenantId = randomUUID();
    let stored: any;
    repo.saveApiKey.mockImplementation((k: any) => {
      stored = k;
      return Promise.resolve(k);
    });
    const { apiKey, rawKey } = await service.createApiKey(tenantId, {
      name: 'CI key',
      scopes: ['dashboards:read'],
    });
    expect(rawKey).toContain('eda_');
    expect(queueService.addJob).toHaveBeenCalled();

    repo.getApiKeyByHash.mockResolvedValue({ apiKey: stored, tenantId });
    const result = await service.validateApiKey(rawKey, 'dashboards:read');
    expect(result.tenantId).toBe(tenantId);
    expect(result.apiKey.id).toBe(apiKey.id);
    expect(result.apiKey.usageCount).toBe(1);
  });

  it('rejects validation when the required scope is missing', async () => {
    const tenantId = randomUUID();
    let stored: any;
    repo.saveApiKey.mockImplementation((k: any) => {
      stored = k;
      return Promise.resolve(k);
    });
    const { rawKey } = await service.createApiKey(tenantId, {
      name: 'Limited key',
      scopes: ['dashboards:read'],
    });
    repo.getApiKeyByHash.mockResolvedValue({ apiKey: stored, tenantId });
    await expect(
      service.validateApiKey(rawKey, 'webhooks:write'),
    ).rejects.toThrow();
  });

  it('revokes an API key', async () => {
    const tenantId = randomUUID();
    repo.saveApiKey.mockImplementation((k: any) => Promise.resolve(k));
    const { apiKey } = await service.createApiKey(tenantId, {
      name: 'CI key',
      scopes: ['*'],
    });
    repo.getApiKey.mockResolvedValue(apiKey);
    const revoked = await service.revokeApiKey(
      tenantId,
      apiKey.id,
      'admin-1',
      'no longer needed',
    );
    expect(revoked.status.value).toBe('REVOKED');
  });
});

describe('AdminWebhookService', () => {
  let service: AdminWebhookService;
  let repo: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminWebhookService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: AdminEventPublisher, useValue: publisherMock },
      ],
    }).compile();
    service = module.get(AdminWebhookService);
    jest.clearAllMocks();
  });

  it('registers a webhook with an encrypted secret distinct from the raw secret', async () => {
    const tenantId = randomUUID();
    const { webhook, secret } = await service.registerWebhook(tenantId, {
      name: 'Slack',
      url: 'https://example.com/hook',
      events: ['admin.incident.created'],
    });
    expect(secret).toBeTruthy();
    expect(webhook.secretEncrypted).not.toBe(secret);
    expect(repo.saveWebhook).toHaveBeenCalled();
  });

  it('verifies a valid signature and rejects a tampered one', async () => {
    const secret = 'super-secret';
    const body = JSON.stringify({ hello: 'world' });
    const validSig = require('crypto')
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    expect(service.verifySignature(secret, body, validSig)).toBe(true);
    expect(service.verifySignature(secret, body, 'deadbeef')).toBe(false);
  });

  it('dispatchEvent is a no-op when no webhook subscribes to the event', async () => {
    repo.findWebhooksForEvent.mockResolvedValue([]);
    await expect(
      service.dispatchEvent(randomUUID(), 'admin.incident.created', {}),
    ).resolves.toBeUndefined();
    expect(repo.saveWebhook).not.toHaveBeenCalled();
  });
});

describe('AdminIncidentService', () => {
  let service: AdminIncidentService;
  let repo: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminIncidentService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: AdminEventPublisher, useValue: publisherMock },
      ],
    }).compile();
    service = module.get(AdminIncidentService);
    jest.clearAllMocks();
    repo.saveIncident.mockImplementation((i: any) => Promise.resolve(i));
  });

  it('creates a new incident when none is open for the service', async () => {
    repo.findOpenIncidentByService.mockResolvedValue(null);
    const tenantId = randomUUID();
    const incident = await service.openOrEscalate(
      tenantId,
      'database',
      'database is down',
      IncidentSeverityEnum.CRITICAL,
    );
    expect(incident.status.value).toBe(IncidentStatusEnum.OPEN);
    expect(repo.saveIncident).toHaveBeenCalled();
  });

  it('escalates an already-open incident instead of duplicating it', async () => {
    const tenantId = randomUUID();
    const existing = OperationalIncident.create(randomUUID(), {
      tenantId,
      title: 'database is degraded',
      severity: IncidentSeverityEnum.MEDIUM,
      affectedService: 'database',
    });
    repo.findOpenIncidentByService.mockResolvedValue(existing);
    const result = await service.openOrEscalate(
      tenantId,
      'database',
      'database is down',
      IncidentSeverityEnum.CRITICAL,
    );
    expect(result.id).toBe(existing.id);
    expect(result.severity).toBe(IncidentSeverityEnum.CRITICAL);
  });

  it('resolves the open incident for a recovered service', async () => {
    const tenantId = randomUUID();
    const existing = OperationalIncident.create(randomUUID(), {
      tenantId,
      title: 'database is down',
      severity: IncidentSeverityEnum.CRITICAL,
      affectedService: 'database',
    });
    repo.findOpenIncidentByService.mockResolvedValue(existing);
    const resolved = await service.resolveByService(tenantId, 'database');
    expect(resolved?.status.value).toBe(IncidentStatusEnum.RESOLVED);
  });

  it('returns null when resolving a service with no open incident', async () => {
    repo.findOpenIncidentByService.mockResolvedValue(null);
    const resolved = await service.resolveByService(randomUUID(), 'database');
    expect(resolved).toBeNull();
  });
});

describe('AdminOverrideService', () => {
  let service: AdminOverrideService;
  let repo: any;
  let connectorRepo: any;
  let aiSettingsService: any;
  let connectorExecutionService: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    connectorRepo = {
      getRateLimit: jest.fn(),
      findLogs: jest.fn(),
    };
    aiSettingsService = {
      getAiSettings: jest.fn(),
      updateAiSettings: jest.fn(),
    };
    connectorExecutionService = { getExecutions: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOverrideService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: 'IConnectorRepository', useValue: connectorRepo },
        { provide: AdminEventPublisher, useValue: publisherMock },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
        { provide: aiSettingsServiceToken(), useValue: aiSettingsService },
        {
          provide: aiAgentServiceToken(),
          useValue: {
            findAgents: jest.fn(),
            updateAgent: jest.fn(),
            setAgentModelConfig: jest.fn(),
          },
        },
        {
          provide: aiUsageServiceToken(),
          useValue: { getUsageMetrics: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: connectorExecutionServiceToken(),
          useValue: connectorExecutionService,
        },
      ],
    }).compile();
    service = module.get(AdminOverrideService);
    jest.clearAllMocks();
  });

  function aiSettingsServiceToken() {
    return require('../../settings/services/ai-settings.service')
      .AiSettingsService;
  }
  function aiAgentServiceToken() {
    return require('../../ai-integration/services/ai-agent.service')
      .AiAgentService;
  }
  function aiUsageServiceToken() {
    return require('../../ai-integration/services/ai-usage.service')
      .AiUsageService;
  }
  function connectorExecutionServiceToken() {
    return require('../../connectors/services/connector-execution.service')
      .ConnectorExecutionService;
  }

  it('creates a tenant override', async () => {
    const tenantId = randomUUID();
    const override = await service.createOverride(tenantId, {
      featureKey: 'beta.workflows',
      overrideValue: { enabled: true },
      reason: 'Beta rollout',
    });
    expect(override.featureKey).toBe('beta.workflows');
    expect(repo.saveOverride).toHaveBeenCalled();
  });

  it('grants and revokes feature access', async () => {
    const tenantId = randomUUID();
    repo.getFeatureAccess.mockResolvedValueOnce(null);
    const granted = await service.setFeatureAccess(tenantId, {
      featureKey: 'beta.inbox',
      isEnabled: true,
    });
    expect(granted.isEnabled).toBe(true);

    repo.getFeatureAccess.mockResolvedValueOnce(granted);
    const revoked = await service.setFeatureAccess(tenantId, {
      featureKey: 'beta.inbox',
      isEnabled: false,
    });
    expect(revoked.isEnabled).toBe(false);
  });

  it('treats a feature as enabled by default when no access record exists', async () => {
    repo.getFeatureAccess.mockResolvedValue(null);
    await expect(
      service.isFeatureEnabled(randomUUID(), 'unknown.feature'),
    ).resolves.toBe(true);
  });

  it('surfaces connector governance: rate limit and execution failure counts', async () => {
    connectorRepo.getRateLimit.mockResolvedValue({
      windowSeconds: 60,
      maxRequests: 100,
      currentUsage: 42,
      resetAt: new Date(),
    });
    connectorExecutionService.getExecutions.mockImplementation(
      (_tenantId: string, _connectorId: string, options: any) => {
        if (options.status === 'FAILED') {
          return Promise.resolve({ data: [], total: 2 });
        }
        return Promise.resolve({
          data: [{ attempt: 1 }, { attempt: 3 }],
          total: 10,
        });
      },
    );
    const result = await service.getConnectorGovernance(
      randomUUID(),
      randomUUID(),
    );
    expect(result.totalExecutions).toBe(10);
    expect(result.failedExecutions).toBe(2);
    expect(result.retriedExecutions).toBe(1);
    expect(result.rateLimit?.currentUsage).toBe(42);
  });
});

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let repo: any;
  let auditRepository: any;
  let connectorRepo: any;
  let workflowAuditService: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    auditRepository = { findPaginated: jest.fn() };
    connectorRepo = { findLogs: jest.fn() };
    workflowAuditService = { getAuditLogs: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditService,
        { provide: 'IAdminRepository', useValue: repo },
        { provide: 'IConnectorRepository', useValue: connectorRepo },
        { provide: AuditRepository, useValue: auditRepository },
        { provide: WorkflowAuditService, useValue: workflowAuditService },
      ],
    }).compile();
    service = module.get(AdminAuditService);
    jest.clearAllMocks();
  });

  it('lists entity changes via the global audit repository', async () => {
    auditRepository.findPaginated.mockResolvedValue({ data: [], total: 0 });
    const tenantId = randomUUID();
    await service.listEntityChanges(tenantId, { page: 1, limit: 10 });
    expect(auditRepository.findPaginated).toHaveBeenCalledWith(tenantId, {
      page: 1,
      limit: 10,
    });
  });

  it('filters API key changes by action prefix', async () => {
    auditRepository.findPaginated.mockResolvedValue({
      data: [
        { action: 'API_KEY_CREATED' },
        { action: 'API_KEY_REVOKED' },
        { action: 'workflow.execution.completed' },
      ],
      total: 3,
    });
    const result = await service.listApiKeyChanges(randomUUID(), {});
    expect(result.total).toBe(2);
    expect(result.data.every((r: any) => r.action.startsWith('API_KEY'))).toBe(
      true,
    );
  });

  it('delegates workflow changes to the workflow audit service', async () => {
    workflowAuditService.getAuditLogs.mockResolvedValue([
      { action: 'workflow.created' },
    ]);
    const tenantId = randomUUID();
    const workflowId = randomUUID();
    const result = await service.listWorkflowChanges(tenantId, workflowId);
    expect(workflowAuditService.getAuditLogs).toHaveBeenCalledWith(
      tenantId,
      workflowId,
      undefined,
    );
    expect(result).toHaveLength(1);
  });

  it('creates and lists saved audit views', async () => {
    const tenantId = randomUUID();
    const userId = randomUUID();
    const view = await service.createAuditView(tenantId, userId, {
      name: 'My security feed',
      filterDefinition: { category: 'SECURITY' },
    });
    expect(repo.saveAuditView).toHaveBeenCalled();
    expect(view.userId).toBe(userId);
  });
});

describe('AdminWidgetService', () => {
  let service: AdminWidgetService;
  let repo: any;
  let analyticsDashboardService: any;

  beforeEach(async () => {
    repo = adminRepoFactory();
    analyticsDashboardService = {
      getDashboardMetrics: jest.fn(),
      getAiDashboardMetrics: jest.fn(),
      getAgentSummaryMetrics: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminWidgetService,
        { provide: 'IAdminRepository', useValue: repo },
        {
          provide: 'IAnalyticsRepository',
          useValue: { getWorkflowMetricsSummary: jest.fn() },
        },
        {
          provide:
            require('../../analytics/services/analytics-dashboard.service')
              .AnalyticsDashboardService,
          useValue: analyticsDashboardService,
        },
        {
          provide: require('../../ai-integration/services/ai-usage.service')
            .AiUsageService,
          useValue: { getUsageMetrics: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: require('../../connectors/services/connector.service')
            .ConnectorService,
          useValue: { getConnectors: jest.fn() },
        },
        {
          provide: require('../../customers/services/customer.service')
            .CustomerService,
          useValue: { findPaginated: jest.fn() },
        },
        {
          provide: require('../../inbox/services/inbox-presence.service')
            .InboxPresenceService,
          useValue: { listOnline: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(AdminWidgetService);
    jest.clearAllMocks();
  });

  it('computes SYSTEM_HEALTH widget data from the admin repository', async () => {
    repo.listSystemHealth.mockResolvedValue([
      {
        toJSON: () => ({ serviceName: 'database' }),
        status: { isOperational: () => true },
      },
      {
        toJSON: () => ({ serviceName: 'redis' }),
        status: { isOperational: () => false },
      },
    ]);
    const data = await service.computeWidgetData(
      randomUUID(),
      AdminWidgetTypeEnum.SYSTEM_HEALTH,
    );
    expect(data.totalCount).toBe(2);
    expect(data.healthyCount).toBe(1);
  });

  it('computes CONVERSATION_METRICS widget data via the analytics dashboard service', async () => {
    analyticsDashboardService.getDashboardMetrics.mockResolvedValue({
      conversationsCount: 12,
      messagesCount: 40,
      averageResponseTime: 30,
      averageResolutionTime: 120,
      csatScore: 4.5,
    });
    const data = await service.computeWidgetData(
      randomUUID(),
      AdminWidgetTypeEnum.CONVERSATION_METRICS,
    );
    expect(data.conversationsCount).toBe(12);
    expect(data.messagesCount).toBe(40);
  });
});

describe('AdminHealthService', () => {
  let service: AdminHealthService;
  let moduleRef: any;
  let fakeQueue: any;

  beforeEach(async () => {
    fakeQueue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 0,
      }),
      isPaused: jest.fn().mockResolvedValue(false),
      getWorkers: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getJob: jest.fn(),
      getJobs: jest.fn().mockResolvedValue([]),
    };
    moduleRef = { get: jest.fn().mockReturnValue(fakeQueue) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminHealthService,
        { provide: 'IAdminRepository', useValue: adminRepoFactory() },
        { provide: AdminEventPublisher, useValue: publisherMock },
        { provide: require('@nestjs/core').ModuleRef, useValue: moduleRef },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
        {
          provide: require('../../connectors/services/connector-health.service')
            .ConnectorHealthService,
          useValue: { runHealthSweep: jest.fn() },
        },
        {
          provide: require('../../connectors/services/connector.service')
            .ConnectorService,
          useValue: { getConnectors: jest.fn() },
        },
        {
          provide:
            require('../../workflows/services/workflow-execution.service')
              .WorkflowExecutionService,
          useValue: { findExecutions: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: require('../../../integration/iam/iam.service')
            .IamIntegrationService,
          useValue: {},
        },
      ],
    }).compile();
    service = module.get(AdminHealthService);
    jest.clearAllMocks();
  });

  it('reports stats for a single queue', async () => {
    fakeQueue.getJobCounts.mockResolvedValue({
      waiting: 1,
      active: 2,
      completed: 3,
      failed: 4,
      delayed: 0,
    });
    const stats = await service.getQueueStats('admin-queue');
    expect(stats.waiting).toBe(1);
    expect(stats.failed).toBe(4);
  });

  it('aggregates stats across every registered queue', async () => {
    const stats = await service.getAllQueueStats();
    expect(stats.length).toBe(service.listQueueNames().length);
  });

  it('returns a workflow status breakdown for a tenant', async () => {
    const breakdown = await service.getWorkflowMonitoring(randomUUID());
    expect(breakdown).toHaveProperty('FAILED');
    expect(breakdown).toHaveProperty('ACTIVE');
  });

  it('replays a dead-letter job back onto its source queue', async () => {
    fakeQueue.getJob.mockResolvedValue({
      data: {
        sourceQueue: 'connector-queue',
        jobName: 'connector-retry-job',
        data: { foo: 'bar' },
      },
      remove: jest.fn(),
    });
    const replayed = await service.replayDeadLetterJob('job-1');
    expect(replayed).toBe(true);
  });

  it('returns false when retrying a job that no longer exists', async () => {
    fakeQueue.getJob.mockResolvedValue(null);
    const retried = await service.retryJob('connector-queue', 'missing-job');
    expect(retried).toBe(false);
  });
});

describe('AdminQueueProcessor', () => {
  let processor: AdminQueueProcessor;
  const healthService = {
    runHealthSweep: jest.fn(),
    refreshConnectorHealth: jest.fn(),
  };
  const webhookService = { dispatchEvent: jest.fn() };
  const incidentService = {
    openOrEscalate: jest.fn(),
    resolveByService: jest.fn(),
  };
  const overrideService = { processExpiredOverrides: jest.fn() };
  const auditService = { log: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminQueueProcessor,
        { provide: AdminHealthService, useValue: healthService },
        { provide: AdminWebhookService, useValue: webhookService },
        { provide: AdminIncidentService, useValue: incidentService },
        { provide: AdminOverrideService, useValue: overrideService },
        { provide: AuditService, useValue: auditService },
        { provide: QueueService, useValue: { addJob: jest.fn() } },
      ],
    }).compile();
    processor = module.get(AdminQueueProcessor);
    jest.clearAllMocks();
  });

  it('routes admin-health-job with a tenant to a per-tenant sweep', async () => {
    healthService.runHealthSweep.mockResolvedValue([{}, {}]);
    const result = await processor.handleJob({
      name: 'admin-health-job',
      id: 'j1',
      data: { _tenantContext: { tenantId: randomUUID() } },
    } as any);
    expect(healthService.runHealthSweep).toHaveBeenCalled();
    expect(result.checked).toBe(2);
  });

  it('routes a tenant-less admin-health-job to the global connector refresh', async () => {
    const result = await processor.handleJob({
      name: 'admin-health-job',
      id: 'j2',
      data: {},
    } as any);
    expect(healthService.refreshConnectorHealth).toHaveBeenCalled();
    expect(result.refreshedConnectorHealth).toBe(true);
  });

  it('routes admin-incident-job resolve flag to resolveByService', async () => {
    incidentService.resolveByService.mockResolvedValue({ id: 'incident-1' });
    const result = await processor.handleJob({
      name: 'admin-incident-job',
      id: 'j3',
      data: {
        _tenantContext: { tenantId: randomUUID() },
        affectedService: 'database',
        resolve: true,
      },
    } as any);
    expect(incidentService.resolveByService).toHaveBeenCalled();
    expect(result.resolvedIncidentId).toBe('incident-1');
  });

  it('routes admin-cleanup-job to processExpiredOverrides', async () => {
    overrideService.processExpiredOverrides.mockResolvedValue(3);
    const result = await processor.handleJob({
      name: 'admin-cleanup-job',
      id: 'j4',
      data: {},
    } as any);
    expect(result.removedOverrides).toBe(3);
  });

  it('throws on an unknown job name', async () => {
    await expect(
      processor.handleJob({ name: 'nope', id: 'j5', data: {} } as any),
    ).rejects.toThrow('Unknown job name: nope');
  });
});
