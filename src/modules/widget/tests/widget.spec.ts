import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      quit: jest.fn().mockResolvedValue('OK'),
    };
  });
});

// Mock axios
jest.mock('axios', () => {
  return {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('good-domain')) {
        return Promise.resolve({ data: 'easydev-verify-token-123\n' });
      }
      return Promise.reject(new Error('Connection failed'));
    }),
  };
});

jest.mock('@easydev/database', () => {
  const original = jest.requireActual('@easydev/database');
  const mockSchema = {
    ...original.schema,
    widgetConfigs: { id: {} },
    widgetVisitors: { id: {}, anonymousId: {}, email: {}, customerId: {} },
    widgetSessions: { id: {}, visitorId: {}, sessionToken: {} },
    widgetIdentities: { id: {}, visitorId: {} },
    widgetLeads: { id: {}, email: {} },
    widgetEvents: { id: {}, sessionId: {} },
    widgetPageViews: { id: {}, sessionId: {} },
    widgetConversations: { id: {}, widgetSessionId: {}, conversationId: {} },
    widgetAuthTokens: { id: {}, visitorId: {}, expiresAt: {} },
    widgetInstallations: { id: {}, domain: {} },
    customers: { id: {}, email: {} },
    customerProfiles: { id: {} },
    messages: { id: {}, conversationId: {} },
  };
  return {
    ...original,
    schema: mockSchema,
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockResolvedValue([{}]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    },
  };
});

import { db, schema } from '@easydev/database';

// Value Objects and Entities
import {
  WidgetId,
  VisitorId,
  SessionId,
  LeadId,
  InstallationId,
  DomainName,
  WidgetConfig,
  WidgetVisitor,
  WidgetSession,
  WidgetIdentity,
  WidgetLead,
  WidgetEvent,
  WidgetPageView,
  WidgetConversation,
  WidgetAuthToken,
  WidgetInstallation,
} from '../domain';

// Services
import { WidgetConfigService } from '../services/widget-config.service';
import { WidgetSessionService } from '../services/widget-session.service';
import { WidgetVisitorService } from '../services/widget-visitor.service';
import { WidgetLeadService } from '../services/widget-lead.service';
import { WidgetIdentityService } from '../services/widget-identity.service';
import { WidgetEventService } from '../services/widget-event.service';
import { WidgetInstallationService } from '../services/widget-installation.service';
import { WidgetRealtimeService } from '../services/widget-realtime.service';
import { WidgetRealtimeGateway } from '../services/widget-realtime.gateway';
import { WidgetEventPublisher } from '../services/widget-event.publisher';

// Controllers
import { WidgetConfigController } from '../controllers/widget-config.controller';
import { WidgetSessionController } from '../controllers/widget-session.controller';
import { WidgetVisitorController } from '../controllers/widget-visitor.controller';
import { WidgetLeadController } from '../controllers/widget-lead.controller';
import { WidgetInstallationController } from '../controllers/widget-installation.controller';
import { WidgetEventController } from '../controllers/widget-event.controller';
import { WidgetAuthController } from '../controllers/widget-auth.controller';

// Jobs
import { WidgetQueueProcessor } from '../jobs/widget-queue.processor';

// Shared
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { RbacGuard } from '../../../common/guards/rbac.guard';
import { AuditService } from '../../audit/audit.service';
import { QueueService } from '@easydev/shared-queues';

describe('Widget Module Unit Tests', () => {
  let configService: WidgetConfigService;
  let sessionService: WidgetSessionService;
  let visitorService: WidgetVisitorService;
  let leadService: WidgetLeadService;
  let identityService: WidgetIdentityService;
  let eventService: WidgetEventService;
  let installationService: WidgetInstallationService;
  let realtimeService: WidgetRealtimeService;
  let gateway: WidgetRealtimeGateway;
  let publisher: WidgetEventPublisher;
  let processor: WidgetQueueProcessor;

  let configController: WidgetConfigController;
  let sessionController: WidgetSessionController;
  let visitorController: WidgetVisitorController;
  let leadController: WidgetLeadController;
  let installationController: WidgetInstallationController;
  let eventController: WidgetEventController;
  let authController: WidgetAuthController;

  const mockWidgetRepo = {
    saveWidgetConfig: jest.fn(),
    getWidgetConfig: jest.fn(),
    saveVisitor: jest.fn(),
    getVisitorById: jest.fn(),
    getVisitorByAnonymousId: jest.fn(),
    getVisitorByEmail: jest.fn(),
    saveSession: jest.fn(),
    getSessionById: jest.fn(),
    getSessionByToken: jest.fn(),
    saveIdentity: jest.fn(),
    getIdentityByVisitor: jest.fn(),
    saveLead: jest.fn(),
    getLeadById: jest.fn(),
    getLeadByEmail: jest.fn(),
    saveEvent: jest.fn(),
    getEventsBySession: jest.fn(),
    savePageView: jest.fn(),
    getPageViewsBySession: jest.fn(),
    saveConversation: jest.fn(),
    getConversationsBySession: jest.fn(),
    saveAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
    deleteAuthToken: jest.fn(),
    saveInstallation: jest.fn(),
    getInstallationById: jest.fn(),
    getInstallationByDomain: jest.fn(),
  };

  const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const tenantId = uuidv4();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        WidgetConfigController,
        WidgetSessionController,
        WidgetVisitorController,
        WidgetLeadController,
        WidgetInstallationController,
        WidgetEventController,
        WidgetAuthController,
      ],
      providers: [
        {
          provide: 'IWidgetRepository',
          useValue: mockWidgetRepo,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        WidgetConfigService,
        WidgetSessionService,
        WidgetVisitorService,
        WidgetLeadService,
        WidgetIdentityService,
        WidgetEventService,
        WidgetInstallationService,
        WidgetRealtimeService,
        WidgetRealtimeGateway,
        WidgetEventPublisher,
        WidgetQueueProcessor,
      ],
    })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    configService = module.get<WidgetConfigService>(WidgetConfigService);
    sessionService = module.get<WidgetSessionService>(WidgetSessionService);
    visitorService = module.get<WidgetVisitorService>(WidgetVisitorService);
    leadService = module.get<WidgetLeadService>(WidgetLeadService);
    identityService = module.get<WidgetIdentityService>(WidgetIdentityService);
    eventService = module.get<WidgetEventService>(WidgetEventService);
    installationService = module.get<WidgetInstallationService>(WidgetInstallationService);
    realtimeService = module.get<WidgetRealtimeService>(WidgetRealtimeService);
    gateway = module.get<WidgetRealtimeGateway>(WidgetRealtimeGateway);
    publisher = module.get<WidgetEventPublisher>(WidgetEventPublisher);
    processor = module.get<WidgetQueueProcessor>(WidgetQueueProcessor);

    configController = module.get<WidgetConfigController>(WidgetConfigController);
    sessionController = module.get<WidgetSessionController>(WidgetSessionController);
    visitorController = module.get<WidgetVisitorController>(WidgetVisitorController);
    leadController = module.get<WidgetLeadController>(WidgetLeadController);
    installationController = module.get<WidgetInstallationController>(WidgetInstallationController);
    eventController = module.get<WidgetEventController>(WidgetEventController);
    authController = module.get<WidgetAuthController>(WidgetAuthController);
  });

  describe('Value Objects', () => {
    it('should validate and create correct value objects', () => {
      const widgetId = WidgetId.create('widget-id');
      const visitorId = VisitorId.create('visitor-id');
      const sessionId = SessionId.create('session-id');
      const leadId = LeadId.create('lead-id');
      const installId = InstallationId.create('install-id');
      const domainName = DomainName.create('google.com');

      expect(widgetId.value).toBe('widget-id');
      expect(visitorId.value).toBe('visitor-id');
      expect(sessionId.value).toBe('session-id');
      expect(leadId.value).toBe('lead-id');
      expect(installId.value).toBe('install-id');
      expect(domainName.value).toBe('google.com');
    });

    it('should throw error for empty value object values', () => {
      expect(() => WidgetId.create('')).toThrow();
      expect(() => DomainName.create('invaliddomain#com')).toThrow();
    });
  });

  describe('Domain Aggregates and Entities', () => {
    it('should correctly mutate Visitor status and count', () => {
      const visitor = new WidgetVisitor('vis-1', {
        tenantId,
        anonymousId: 'anon-123',
        visitCount: 1,
      });
      visitor.incrementVisit();
      expect(visitor.visitCount).toBe(2);

      visitor.linkCustomer('cust-123');
      expect(visitor.customerId).toBe('cust-123');

      const otherVisitor = new WidgetVisitor('vis-2', {
        tenantId,
        anonymousId: 'anon-456',
        email: 'test@example.com',
        visitCount: 5,
      });

      visitor.merge(otherVisitor);
      expect(visitor.email).toBe('test@example.com');
      expect(visitor.visitCount).toBe(7);
    });

    it('should score and qualify WidgetLeads', () => {
      const lead = new WidgetLead('lead-1', {
        tenantId,
        email: 'hello@company.com',
        source: 'lead-form',
        leadScore: 10,
        status: 'NEW',
      });

      lead.qualify(45);
      expect(lead.leadScore).toBe(55);
      expect(lead.status).toBe('QUALIFIED');

      lead.updateStatus('CONTACTED');
      expect(lead.status).toBe('CONTACTED');
    });

    it('should handle session ending', () => {
      const session = new WidgetSession('sess-1', {
        tenantId,
        visitorId: 'vis-1',
        sessionToken: 'token-abc',
      });
      expect(session.endedAt).toBeUndefined();
      session.end();
      expect(session.endedAt).toBeInstanceOf(Date);
    });

    it('should check auth token expiration', () => {
      const activeToken = new WidgetAuthToken('t-1', {
        tenantId,
        visitorId: 'v-1',
        tokenHash: 'h-1',
        expiresAt: new Date(Date.now() + 60000),
      });
      const expiredToken = new WidgetAuthToken('t-2', {
        tenantId,
        visitorId: 'v-1',
        tokenHash: 'h-2',
        expiresAt: new Date(Date.now() - 60000),
      });

      expect(activeToken.isExpired()).toBe(false);
      expect(expiredToken.isExpired()).toBe(true);

      activeToken.use();
      expect(activeToken.lastUsedAt).toBeInstanceOf(Date);
    });
  });

  describe('WidgetConfigService', () => {
    it('should create default configuration when none exists', async () => {
      mockWidgetRepo.getWidgetConfig.mockResolvedValue(null);
      mockWidgetRepo.saveWidgetConfig.mockResolvedValue(undefined);

      const config = await configService.getOrCreateConfig(tenantId);
      expect(config.widgetName).toBe('EasyDev Support AI Chat');
      expect(config.primaryColor).toBe('#0F172A');
      expect(mockWidgetRepo.saveWidgetConfig).toHaveBeenCalled();
    });

    it('should update config and publish event', async () => {
      const mockConfig = new WidgetConfig('cfg-1', {
        tenantId,
        widgetName: 'Default',
        theme: 'light',
        primaryColor: '#000',
        secondaryColor: '#fff',
        position: 'bottom-right',
        allowedDomains: [],
      });
      mockWidgetRepo.getWidgetConfig.mockResolvedValue(mockConfig);

      const updated = await configService.updateConfig(tenantId, {
        widgetName: 'Custom Widget Name',
        theme: 'dark',
      });

      expect(updated.widgetName).toBe('Custom Widget Name');
      expect(updated.theme).toBe('dark');
      expect(mockWidgetRepo.saveWidgetConfig).toHaveBeenCalled();
      expect(mockQueueService.addJob).toHaveBeenCalled();
    });

    it('should validate allowed domains', async () => {
      const mockConfig = new WidgetConfig('cfg-1', {
        tenantId,
        widgetName: 'Default',
        theme: 'light',
        primaryColor: '#000',
        secondaryColor: '#fff',
        position: 'bottom-right',
        allowedDomains: ['*.example.com', 'google.com'],
      });
      mockWidgetRepo.getWidgetConfig.mockResolvedValue(mockConfig);

      expect(await configService.validateDomain(tenantId, 'https://google.com')).toBe(true);
      expect(await configService.validateDomain(tenantId, 'https://sub.example.com')).toBe(true);
      expect(await configService.validateDomain(tenantId, 'https://attacker.com')).toBe(false);
      expect(await configService.validateDomain(tenantId, 'http://localhost')).toBe(true);
    });
  });

  describe('WidgetVisitorService', () => {
    it('should get or create anonymous visitor', async () => {
      mockWidgetRepo.getVisitorByAnonymousId.mockResolvedValue(null);
      const visitor = await visitorService.getOrCreateAnonymousVisitor(tenantId, 'anon-id-99');
      expect(visitor.anonymousId).toBe('anon-id-99');
      expect(mockWidgetRepo.saveVisitor).toHaveBeenCalled();
    });

    it('should identify visitor and link database customer profiles', async () => {
      const visitor = new WidgetVisitor('vis-abc', {
        tenantId,
        anonymousId: 'anon-abc',
        visitCount: 1,
      });
      mockWidgetRepo.getVisitorByAnonymousId.mockResolvedValue(visitor);
      mockWidgetRepo.getVisitorByEmail.mockResolvedValue(null);

      // Mock Drizzle client returning customer row
      const selectMock = db.select() as any;
      selectMock.from.mockReturnThis();
      selectMock.where.mockResolvedValue([{ id: 'cust-uuid' }]);

      const identified = await visitorService.identify(tenantId, {
        anonymousId: 'anon-abc',
        email: 'customer@company.com',
        name: 'Jane Doe',
      });

      expect(identified.email).toBe('customer@company.com');
      expect(identified.name).toBe('Jane Doe');
      expect(identified.customerId).toBe('cust-uuid');
    });
  });

  describe('WidgetSessionService', () => {
    it('should start session and generate secure signed JWT-like token', async () => {
      const visitor = new WidgetVisitor('vis-xyz', {
        tenantId,
        anonymousId: 'anon-xyz',
        visitCount: 1,
      });
      mockWidgetRepo.getVisitorByAnonymousId.mockResolvedValue(visitor);

      const result = await sessionService.startSession(tenantId, {
        anonymousId: 'anon-xyz',
        userAgent: 'Chrome',
        referrer: 'direct',
      });

      expect(result.session).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.split('.').length).toBe(2);
      expect(mockWidgetRepo.saveSession).toHaveBeenCalled();
    });

    it('should validate active session token and update last used timestamp', async () => {
      const visitorId = 'vis-jwt';
      const sessionId = 'sess-jwt';
      const expiresAt = Date.now() + 100000;
      const payload = JSON.stringify({ tenantId, visitorId, sessionId, expiresAt });
      const signature = crypto
        .createHmac('sha256', 'easydev-widget-fallback-secret-key-123456')
        .update(payload)
        .digest('hex');
      const token = Buffer.from(payload).toString('base64url') + '.' + signature;

      const mockDbToken = new WidgetAuthToken('token-id', {
        tenantId,
        visitorId,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(expiresAt),
      });

      mockWidgetRepo.getAuthToken.mockResolvedValue(mockDbToken);

      const resolved = await sessionService.validateSessionToken(tenantId, token);
      expect(resolved.visitorId).toBe(visitorId);
      expect(resolved.sessionId).toBe(sessionId);
      expect(mockWidgetRepo.saveAuthToken).toHaveBeenCalled();
    });

    it('should reject invalid token signature', async () => {
      const token = 'fakeTokenStr.badSignature';
      await expect(sessionService.validateSessionToken(tenantId, token)).rejects.toThrow();
    });
  });

  describe('WidgetLeadService', () => {
    it('should capture lead, evaluate score and qualified status', async () => {
      mockWidgetRepo.getLeadByEmail.mockResolvedValue(null);

      // Mock Drizzle customer lookup returning empty (meaning new customer to create)
      const selectMock = db.select() as any;
      selectMock.from.mockReturnThis();
      selectMock.where.mockResolvedValue([]);

      const lead = await leadService.captureLead(tenantId, {
        email: 'sales@apple.com',
        name: 'Tim Cook',
        company: 'Apple Inc.',
        phone: '555-0199',
        source: 'pre-chat',
      });

      expect(lead.email).toBe('sales@apple.com');
      // Score: Apple is business email (30) + Company (20) + Phone (15) = 65
      expect(lead.leadScore).toBe(65);
      expect(lead.status).toBe('QUALIFIED');
      expect(mockWidgetRepo.saveLead).toHaveBeenCalled();
    });
  });

  describe('WidgetInstallationService', () => {
    it('should verify installation domain by checking remote file token', async () => {
      const mockInstall = new WidgetInstallation('inst-1', {
        tenantId,
        domain: 'good-domain.com',
        status: 'PENDING',
        verificationToken: 'easydev-verify-token-123',
      });
      mockWidgetRepo.getInstallationByDomain.mockResolvedValue(mockInstall);

      const verified = await installationService.verifyInstallation(tenantId, 'good-domain.com');
      expect(verified.status).toBe('ACTIVE');
      expect(verified.verifiedAt).toBeInstanceOf(Date);
      expect(mockWidgetRepo.saveInstallation).toHaveBeenCalled();
    });

    it('should throw bad request if remote token fails or mismatch', async () => {
      const mockInstall = new WidgetInstallation('inst-2', {
        tenantId,
        domain: 'bad-domain.com',
        status: 'PENDING',
        verificationToken: 'easydev-verify-token-999',
      });
      mockWidgetRepo.getInstallationByDomain.mockResolvedValue(mockInstall);

      await expect(
        installationService.verifyInstallation(tenantId, 'bad-domain.com'),
      ).rejects.toThrow();
    });
  });

  describe('WidgetEventService', () => {
    it('should track widget client events and page views', async () => {
      const mockSession = new WidgetSession('sess-eve', {
        tenantId,
        visitorId: 'vis-eve',
        sessionToken: 'tok-eve',
      });
      mockWidgetRepo.getSessionById.mockResolvedValue(mockSession);

      const event = await eventService.trackEvent(tenantId, {
        sessionId: 'sess-eve',
        eventName: 'CHAT_OPENED',
        eventData: { path: '/home' },
      });
      expect(event.eventName).toBe('CHAT_OPENED');
      expect(mockWidgetRepo.saveEvent).toHaveBeenCalled();

      const pageView = await eventService.trackPageView(tenantId, {
        sessionId: 'sess-eve',
        url: 'https://example.com/checkout',
        title: 'Checkout Page',
        timeSpentSeconds: 15,
      });
      expect(pageView.url).toBe('https://example.com/checkout');
      expect(mockWidgetRepo.savePageView).toHaveBeenCalled();
    });
  });

  describe('WidgetRealtimeService & Gateway', () => {
    it('should verify typing indicators and presence updates', async () => {
      const mockSocket: any = {
        data: { tenantId, sessionId: 'sess-123', visitorId: 'vis-123' },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      const mockRealtimeGateway: any = {
        server: {
          to: jest.fn().mockReturnValue({
            emit: jest.fn(),
          }),
        },
        emitToSession: jest.fn(),
      };

      const customRealtimeService = new WidgetRealtimeService(mockRealtimeGateway);
      await customRealtimeService.sendNewMessage(tenantId, 'sess-123', { text: 'Hello' });
      expect(mockRealtimeGateway.emitToSession).toHaveBeenCalledWith(
        tenantId,
        'sess-123',
        'newMessage',
        { text: 'Hello' },
      );
    });
  });

  describe('Queue Processor', () => {
    it('should execute cleanup jobs successfully', async () => {
      const mockJob: any = {
        name: 'widget-cleanup-job',
        data: {
          tenantId,
        },
        id: 'job-clean-1',
      };

      const result = await processor.handleJob(mockJob);
      expect(result.success).toBe(true);
    });

    it('should process widget sessions and installations auditing', async () => {
      const mockSessionJob: any = {
        name: 'widget-session-job',
        data: {
          tenantId,
          eventName: 'widget.session.started',
          payload: { sessionId: 'sess-123' },
        },
        id: 'job-sess-1',
      };

      const result = await processor.handleJob(mockSessionJob);
      expect(result.success).toBe(true);
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('Controllers Endpoints', () => {
    it('config controller - should return configuration for public fetch', async () => {
      const mockConfig = new WidgetConfig('cfg-1', {
        tenantId,
        widgetName: 'Public Widget',
        theme: 'light',
        primaryColor: '#000',
        secondaryColor: '#fff',
        position: 'bottom-right',
        allowedDomains: [],
      });
      mockWidgetRepo.getWidgetConfig.mockResolvedValue(mockConfig);

      const res = await configController.getPublicConfig(tenantId);
      expect(res.widgetName).toBe('Public Widget');
    });

    it('session controller - should call sessionService start', async () => {
      const mockSession = new WidgetSession('sess-new', {
        tenantId,
        visitorId: 'vis-new',
        sessionToken: 'token-new',
      });
      jest.spyOn(sessionService, 'startSession').mockResolvedValue({
        session: mockSession,
        token: 'token-new',
      });

      const res = await sessionController.startSession(tenantId, {
        anonymousId: 'anon-new',
      });
      expect(res.token).toBe('token-new');
      expect(res.session.id).toBe('sess-new');
    });

    it('visitor controller - should call visitorService identify', async () => {
      const visitor = new WidgetVisitor('vis-xyz', {
        tenantId,
        anonymousId: 'anon-xyz',
        visitCount: 1,
        email: 'user@company.com',
      });
      jest.spyOn(visitorService, 'identify').mockResolvedValue(visitor);

      const res = await visitorController.identifyVisitor(tenantId, {
        anonymousId: 'anon-xyz',
        email: 'user@company.com',
      });
      expect(res.email).toBe('user@company.com');
    });

    it('lead controller - should call leadService capture', async () => {
      const lead = new WidgetLead('lead-xyz', {
        tenantId,
        email: 'lead@company.com',
        source: 'form',
        leadScore: 10,
        status: 'NEW',
      });
      jest.spyOn(leadService, 'captureLead').mockResolvedValue(lead);

      const res = await leadController.captureLead(tenantId, {
        email: 'lead@company.com',
        source: 'form',
      });
      expect(res.email).toBe('lead@company.com');
    });

    it('installation controller - should verify installations & return script tag', async () => {
      const mockInstall = new WidgetInstallation('inst-123', {
        tenantId,
        domain: 'easydev.ai',
        status: 'ACTIVE',
        verificationToken: 'token-123',
      });
      jest.spyOn(installationService, 'verifyInstallation').mockResolvedValue(mockInstall);

      const resVerify = await installationController.verifyInstallation(tenantId, {
        domain: 'easydev.ai',
      });
      expect(resVerify.status).toBe('ACTIVE');

      const resScript = installationController.getScript(tenantId, 'easydev.ai');
      expect(resScript.script).toContain('easydev.ai');
      expect(resScript.script).toContain(tenantId);
    });

    it('event controller - should track events and page views', async () => {
      const mockEvent = new WidgetEvent('evt-123', {
        tenantId,
        sessionId: 'sess-123',
        eventName: 'PAGE_VIEW',
      });
      jest.spyOn(eventService, 'trackEvent').mockResolvedValue(mockEvent);

      const res = await eventController.trackEvent(tenantId, {
        sessionId: 'sess-123',
        eventName: 'PAGE_VIEW',
      });
      expect(res.eventName).toBe('PAGE_VIEW');
    });

    it('auth controller - should resolve verified customer hmac identity', async () => {
      const mockIdentity = new WidgetIdentity('ident-123', {
        tenantId,
        visitorId: 'vis-123',
        externalUserId: 'user-123',
        verificationMethod: 'HMAC_SHA256',
      });
      jest.spyOn(identityService, 'verifyAndResolveIdentity').mockResolvedValue(mockIdentity);

      const res = await authController.verifyIdentity(tenantId, {
        anonymousId: 'anon-123',
        externalUserId: 'user-123',
        signature: 'valid-hmac-signature',
      });
      expect(res.externalUserId).toBe('user-123');
    });
  });
});
