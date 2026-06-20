import {
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
} from '../domain/entities';

export interface IWidgetRepository {
  saveWidgetConfig(config: WidgetConfig): Promise<void>;
  getWidgetConfig(tenantId: string): Promise<WidgetConfig | null>;

  saveVisitor(visitor: WidgetVisitor): Promise<void>;
  getVisitorById(tenantId: string, id: string): Promise<WidgetVisitor | null>;
  getVisitorByAnonymousId(tenantId: string, anonymousId: string): Promise<WidgetVisitor | null>;
  getVisitorByEmail(tenantId: string, email: string): Promise<WidgetVisitor | null>;

  saveSession(session: WidgetSession): Promise<void>;
  getSessionById(tenantId: string, id: string): Promise<WidgetSession | null>;
  getSessionByToken(tenantId: string, token: string): Promise<WidgetSession | null>;

  saveIdentity(identity: WidgetIdentity): Promise<void>;
  getIdentityByVisitor(tenantId: string, visitorId: string): Promise<WidgetIdentity | null>;

  saveLead(lead: WidgetLead): Promise<void>;
  getLeadById(tenantId: string, id: string): Promise<WidgetLead | null>;
  getLeadByEmail(tenantId: string, email: string): Promise<WidgetLead | null>;

  saveEvent(event: WidgetEvent): Promise<void>;
  getEventsBySession(tenantId: string, sessionId: string): Promise<WidgetEvent[]>;

  savePageView(pageView: WidgetPageView): Promise<void>;
  getPageViewsBySession(tenantId: string, sessionId: string): Promise<WidgetPageView[]>;

  saveConversation(conversation: WidgetConversation): Promise<void>;
  getConversationsBySession(tenantId: string, sessionId: string): Promise<WidgetConversation[]>;

  saveAuthToken(authToken: WidgetAuthToken): Promise<void>;
  getAuthToken(tenantId: string, tokenHash: string): Promise<WidgetAuthToken | null>;
  deleteAuthToken(tenantId: string, tokenHash: string): Promise<void>;

  saveInstallation(installation: WidgetInstallation): Promise<void>;
  getInstallationById(tenantId: string, id: string): Promise<WidgetInstallation | null>;
  getInstallationByDomain(tenantId: string, domain: string): Promise<WidgetInstallation | null>;
}
