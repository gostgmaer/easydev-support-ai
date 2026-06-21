import { Test, TestingModule } from '@nestjs/testing';
import { ConnectorService } from '../services/connector.service';
import { ConnectorCredentialService } from '../services/connector-credential.service';
import { ConnectorHealthService } from '../services/connector-health.service';
import { ConnectorImportService } from '../services/connector-import.service';
import { ConnectorWebhookService } from '../services/connector-webhook.service';
import { ConnectorExecutionService } from '../services/connector-execution.service';
import { ConnectorEventPublisher } from '../services/connector-event.publisher';
import { ExecutionEngine } from '../engine/execution-engine';
import { WebhookDispatcher } from '../engine/webhook-dispatcher';
import { CircuitBreakerManager } from '../engine/circuit-breaker-manager';
import { CapabilityResolver } from '../engine/capability-resolver';
import { ConnectorRegistry } from '../engine/connector-registry';
import { ConnectorFactory } from '../engine/connector-factory';
import { CredentialManager } from '../engine/credential-manager';
import { RetryEngine } from '../engine/retry-engine';
import { QueueService } from '@easydev/shared-queues';
import { WorkflowEngineService } from '../../workflows/services/workflow-engine.service';
import {
  ConnectorTypeEnum,
  AuthTypeEnum,
  CapabilityTypeEnum,
} from '../domain/value-objects';

describe('Connector Module Services', () => {
  let connectorService: ConnectorService;
  let credentialService: ConnectorCredentialService;
  let healthService: ConnectorHealthService;
  let importService: ConnectorImportService;
  let webhookService: ConnectorWebhookService;
  let executionService: ConnectorExecutionService;

  const mockRepo = {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    save: jest.fn(),
    saveInstance: jest.fn(),
    findInstances: jest.fn(),
    deleteInstance: jest.fn(),
    saveCredential: jest.fn(),
    getActiveCredential: jest.fn(),
    getCredentialById: jest.fn(),
    saveExecution: jest.fn(),
    getExecution: jest.fn(),
    findExecutionByIdempotency: jest.fn(),
    findExecutions: jest.fn(),
    saveWebhook: jest.fn(),
    getWebhook: jest.fn(),
    findWebhooks: jest.fn(),
    deleteWebhook: jest.fn(),
    getRateLimit: jest.fn(),
    upsertRateLimit: jest.fn(),
    addLog: jest.fn(),
    resolveCapability: jest.fn(),
    findActiveForHealthSweep: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn(),
  };

  const mockWorkflowEngineService = {
    evaluateEventTriggers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectorService,
        ConnectorCredentialService,
        ConnectorHealthService,
        ConnectorImportService,
        ConnectorWebhookService,
        ConnectorExecutionService,
        ConnectorEventPublisher,
        ExecutionEngine,
        WebhookDispatcher,
        CircuitBreakerManager,
        CapabilityResolver,
        ConnectorRegistry,
        ConnectorFactory,
        CredentialManager,
        RetryEngine,
        {
          provide: 'IConnectorRepository',
          useValue: mockRepo,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: WorkflowEngineService,
          useValue: mockWorkflowEngineService,
        },
      ],
    }).compile();

    connectorService = module.get<ConnectorService>(ConnectorService);
    credentialService = module.get<ConnectorCredentialService>(
      ConnectorCredentialService,
    );
    healthService = module.get<ConnectorHealthService>(ConnectorHealthService);
    importService = module.get<ConnectorImportService>(ConnectorImportService);
    webhookService = module.get<ConnectorWebhookService>(
      ConnectorWebhookService,
    );
    executionService = module.get<ConnectorExecutionService>(
      ConnectorExecutionService,
    );
  });

  it('should be defined and resolved successfully', () => {
    expect(connectorService).toBeDefined();
    expect(credentialService).toBeDefined();
    expect(healthService).toBeDefined();
    expect(importService).toBeDefined();
    expect(webhookService).toBeDefined();
    expect(executionService).toBeDefined();
  });
});
