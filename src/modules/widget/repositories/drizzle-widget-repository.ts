import { Injectable } from '@nestjs/common';
import { db, schema } from '@easydev/database';
import { eq, and } from 'drizzle-orm';
import { IWidgetRepository } from './widget-repository.interface';
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

@Injectable()
export class DrizzleWidgetRepository implements IWidgetRepository {
  // ------------ Widget Config ------------
  async saveWidgetConfig(config: WidgetConfig): Promise<void> {
    const raw = {
      id: config.id,
      tenantId: config.tenantId,
      widgetName: config.widgetName,
      theme: config.theme,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      position: config.position,
      welcomeMessage: config.welcomeMessage || null,
      offlineMessage: config.offlineMessage || null,
      avatarUrl: config.avatarUrl || null,
      customCss: config.customCss || null,
      customJs: config.customJs || null,
      allowedDomains: config.allowedDomains,
      updatedAt: new Date(),
      version: config.version,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetConfigs)
      .where(and(
        eq(schema.widgetConfigs.tenantId, config.tenantId),
        eq(schema.widgetConfigs.id, config.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetConfigs)
        .set(raw)
        .where(eq(schema.widgetConfigs.id, config.id));
    } else {
      await db.insert(schema.widgetConfigs).values({
        ...raw,
        createdAt: config.createdAt,
      });
    }
  }

  async getWidgetConfig(tenantId: string): Promise<WidgetConfig | null> {
    const [row] = await db
      .select()
      .from(schema.widgetConfigs)
      .where(eq(schema.widgetConfigs.tenantId, tenantId))
      .limit(1);

    if (!row) return null;

    return new WidgetConfig(row.id, {
      tenantId: row.tenantId,
      widgetName: row.widgetName,
      theme: row.theme,
      primaryColor: row.primaryColor,
      secondaryColor: row.secondaryColor,
      position: row.position,
      welcomeMessage: row.welcomeMessage || undefined,
      offlineMessage: row.offlineMessage || undefined,
      avatarUrl: row.avatarUrl || undefined,
      customCss: row.customCss || undefined,
      customJs: row.customJs || undefined,
      allowedDomains: (row.allowedDomains as string[]) || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  // ------------ Widget Visitor ------------
  async saveVisitor(visitor: WidgetVisitor): Promise<void> {
    const raw = {
      id: visitor.id,
      tenantId: visitor.tenantId,
      anonymousId: visitor.anonymousId,
      customerId: visitor.customerId || null,
      email: visitor.email || null,
      phone: visitor.phone || null,
      name: visitor.name || null,
      country: visitor.country || null,
      city: visitor.city || null,
      firstSeenAt: visitor.firstSeenAt,
      lastSeenAt: visitor.lastSeenAt,
      visitCount: visitor.visitCount,
      updatedAt: new Date(),
      version: visitor.version,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetVisitors)
      .where(and(
        eq(schema.widgetVisitors.tenantId, visitor.tenantId),
        eq(schema.widgetVisitors.id, visitor.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetVisitors)
        .set(raw)
        .where(eq(schema.widgetVisitors.id, visitor.id));
    } else {
      await db.insert(schema.widgetVisitors).values({
        ...raw,
        createdAt: visitor.createdAt,
      });
    }
  }

  async getVisitorById(tenantId: string, id: string): Promise<WidgetVisitor | null> {
    const [row] = await db
      .select()
      .from(schema.widgetVisitors)
      .where(and(
        eq(schema.widgetVisitors.tenantId, tenantId),
        eq(schema.widgetVisitors.id, id)
      ));

    if (!row) return null;

    return new WidgetVisitor(row.id, {
      tenantId: row.tenantId,
      anonymousId: row.anonymousId,
      customerId: row.customerId || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      name: row.name || undefined,
      country: row.country || undefined,
      city: row.city || undefined,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      visitCount: row.visitCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async getVisitorByAnonymousId(tenantId: string, anonymousId: string): Promise<WidgetVisitor | null> {
    const [row] = await db
      .select()
      .from(schema.widgetVisitors)
      .where(and(
        eq(schema.widgetVisitors.tenantId, tenantId),
        eq(schema.widgetVisitors.anonymousId, anonymousId)
      ));

    if (!row) return null;

    return new WidgetVisitor(row.id, {
      tenantId: row.tenantId,
      anonymousId: row.anonymousId,
      customerId: row.customerId || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      name: row.name || undefined,
      country: row.country || undefined,
      city: row.city || undefined,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      visitCount: row.visitCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async getVisitorByEmail(tenantId: string, email: string): Promise<WidgetVisitor | null> {
    const [row] = await db
      .select()
      .from(schema.widgetVisitors)
      .where(and(
        eq(schema.widgetVisitors.tenantId, tenantId),
        eq(schema.widgetVisitors.email, email)
      ));

    if (!row) return null;

    return new WidgetVisitor(row.id, {
      tenantId: row.tenantId,
      anonymousId: row.anonymousId,
      customerId: row.customerId || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      name: row.name || undefined,
      country: row.country || undefined,
      city: row.city || undefined,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      visitCount: row.visitCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  // ------------ Widget Session ------------
  async saveSession(session: WidgetSession): Promise<void> {
    const raw = {
      id: session.id,
      tenantId: session.tenantId,
      visitorId: session.visitorId,
      sessionToken: session.sessionToken,
      startedAt: session.startedAt,
      endedAt: session.endedAt || null,
      ipAddressHash: session.ipAddressHash || null,
      userAgent: session.userAgent || null,
      deviceType: session.deviceType || null,
      browser: session.browser || null,
      os: session.os || null,
      referrer: session.referrer || null,
      landingPage: session.landingPage || null,
      updatedAt: new Date(),
      version: session.version,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetSessions)
      .where(and(
        eq(schema.widgetSessions.tenantId, session.tenantId),
        eq(schema.widgetSessions.id, session.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetSessions)
        .set(raw)
        .where(eq(schema.widgetSessions.id, session.id));
    } else {
      await db.insert(schema.widgetSessions).values({
        ...raw,
        createdAt: session.createdAt,
      });
    }
  }

  async getSessionById(tenantId: string, id: string): Promise<WidgetSession | null> {
    const [row] = await db
      .select()
      .from(schema.widgetSessions)
      .where(and(
        eq(schema.widgetSessions.tenantId, tenantId),
        eq(schema.widgetSessions.id, id)
      ));

    if (!row) return null;

    return new WidgetSession(row.id, {
      tenantId: row.tenantId,
      visitorId: row.visitorId,
      sessionToken: row.sessionToken,
      startedAt: row.startedAt,
      endedAt: row.endedAt || undefined,
      ipAddressHash: row.ipAddressHash || undefined,
      userAgent: row.userAgent || undefined,
      deviceType: row.deviceType || undefined,
      browser: row.browser || undefined,
      os: row.os || undefined,
      referrer: row.referrer || undefined,
      landingPage: row.landingPage || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async getSessionByToken(tenantId: string, token: string): Promise<WidgetSession | null> {
    const [row] = await db
      .select()
      .from(schema.widgetSessions)
      .where(and(
        eq(schema.widgetSessions.tenantId, tenantId),
        eq(schema.widgetSessions.sessionToken, token)
      ));

    if (!row) return null;

    return new WidgetSession(row.id, {
      tenantId: row.tenantId,
      visitorId: row.visitorId,
      sessionToken: row.sessionToken,
      startedAt: row.startedAt,
      endedAt: row.endedAt || undefined,
      ipAddressHash: row.ipAddressHash || undefined,
      userAgent: row.userAgent || undefined,
      deviceType: row.deviceType || undefined,
      browser: row.browser || undefined,
      os: row.os || undefined,
      referrer: row.referrer || undefined,
      landingPage: row.landingPage || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  // ------------ Widget Identity ------------
  async saveIdentity(identity: WidgetIdentity): Promise<void> {
    const raw = {
      id: identity.id,
      tenantId: identity.tenantId,
      visitorId: identity.visitorId,
      externalUserId: identity.externalUserId,
      verificationMethod: identity.verificationMethod,
      verifiedAt: identity.verifiedAt,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select()
      .from(schema.widgetIdentities)
      .where(and(
        eq(schema.widgetIdentities.tenantId, identity.tenantId),
        eq(schema.widgetIdentities.id, identity.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetIdentities)
        .set(raw)
        .where(eq(schema.widgetIdentities.id, identity.id));
    } else {
      await db.insert(schema.widgetIdentities).values({
        ...raw,
        createdAt: identity.createdAt,
      });
    }
  }

  async getIdentityByVisitor(tenantId: string, visitorId: string): Promise<WidgetIdentity | null> {
    const [row] = await db
      .select()
      .from(schema.widgetIdentities)
      .where(and(
        eq(schema.widgetIdentities.tenantId, tenantId),
        eq(schema.widgetIdentities.visitorId, visitorId)
      ));

    if (!row) return null;

    return new WidgetIdentity(row.id, {
      tenantId: row.tenantId,
      visitorId: row.visitorId,
      externalUserId: row.externalUserId,
      verificationMethod: row.verificationMethod,
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  // ------------ Widget Lead ------------
  async saveLead(lead: WidgetLead): Promise<void> {
    const raw = {
      id: lead.id,
      tenantId: lead.tenantId,
      name: lead.name || null,
      email: lead.email,
      phone: lead.phone || null,
      company: lead.company || null,
      source: lead.source,
      leadScore: lead.leadScore,
      status: lead.status,
      capturedAt: lead.capturedAt,
      updatedAt: new Date(),
      version: lead.version,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetLeads)
      .where(and(
        eq(schema.widgetLeads.tenantId, lead.tenantId),
        eq(schema.widgetLeads.id, lead.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetLeads)
        .set(raw)
        .where(eq(schema.widgetLeads.id, lead.id));
    } else {
      await db.insert(schema.widgetLeads).values({
        ...raw,
        createdAt: lead.createdAt,
      });
    }
  }

  async getLeadById(tenantId: string, id: string): Promise<WidgetLead | null> {
    const [row] = await db
      .select()
      .from(schema.widgetLeads)
      .where(and(
        eq(schema.widgetLeads.tenantId, tenantId),
        eq(schema.widgetLeads.id, id)
      ));

    if (!row) return null;

    return new WidgetLead(row.id, {
      tenantId: row.tenantId,
      name: row.name || undefined,
      email: row.email,
      phone: row.phone || undefined,
      company: row.company || undefined,
      source: row.source,
      leadScore: row.leadScore,
      status: row.status,
      capturedAt: row.capturedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async getLeadByEmail(tenantId: string, email: string): Promise<WidgetLead | null> {
    const [row] = await db
      .select()
      .from(schema.widgetLeads)
      .where(and(
        eq(schema.widgetLeads.tenantId, tenantId),
        eq(schema.widgetLeads.email, email)
      ));

    if (!row) return null;

    return new WidgetLead(row.id, {
      tenantId: row.tenantId,
      name: row.name || undefined,
      email: row.email,
      phone: row.phone || undefined,
      company: row.company || undefined,
      source: row.source,
      leadScore: row.leadScore,
      status: row.status,
      capturedAt: row.capturedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  // ------------ Widget Event ------------
  async saveEvent(event: WidgetEvent): Promise<void> {
    const raw = {
      id: event.id,
      tenantId: event.tenantId,
      sessionId: event.sessionId,
      eventName: event.eventName,
      eventData: event.eventData || {},
      createdAt: event.createdAt,
    };

    await db.insert(schema.widgetEvents).values(raw);
  }

  async getEventsBySession(tenantId: string, sessionId: string): Promise<WidgetEvent[]> {
    const rows = await db
      .select()
      .from(schema.widgetEvents)
      .where(and(
        eq(schema.widgetEvents.tenantId, tenantId),
        eq(schema.widgetEvents.sessionId, sessionId)
      ));

    return rows.map((row) => new WidgetEvent(row.id, {
      tenantId: row.tenantId,
      sessionId: row.sessionId,
      eventName: row.eventName,
      eventData: (row.eventData as Record<string, any>) || undefined,
      createdAt: row.createdAt,
    }));
  }

  // ------------ Widget Page View ------------
  async savePageView(pageView: WidgetPageView): Promise<void> {
    const raw = {
      id: pageView.id,
      tenantId: pageView.tenantId,
      sessionId: pageView.sessionId,
      url: pageView.url,
      title: pageView.title || null,
      timeSpentSeconds: pageView.timeSpentSeconds,
      createdAt: pageView.createdAt,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetPageViews)
      .where(and(
        eq(schema.widgetPageViews.tenantId, pageView.tenantId),
        eq(schema.widgetPageViews.id, pageView.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetPageViews)
        .set(raw)
        .where(eq(schema.widgetPageViews.id, pageView.id));
    } else {
      await db.insert(schema.widgetPageViews).values(raw);
    }
  }

  async getPageViewsBySession(tenantId: string, sessionId: string): Promise<WidgetPageView[]> {
    const rows = await db
      .select()
      .from(schema.widgetPageViews)
      .where(and(
        eq(schema.widgetPageViews.tenantId, tenantId),
        eq(schema.widgetPageViews.sessionId, sessionId)
      ));

    return rows.map((row) => new WidgetPageView(row.id, {
      tenantId: row.tenantId,
      sessionId: row.sessionId,
      url: row.url,
      title: row.title || undefined,
      timeSpentSeconds: row.timeSpentSeconds,
      createdAt: row.createdAt,
    }));
  }

  // ------------ Widget Conversation ------------
  async saveConversation(conversation: WidgetConversation): Promise<void> {
    const raw = {
      id: conversation.id,
      tenantId: conversation.tenantId,
      widgetSessionId: conversation.widgetSessionId,
      conversationId: conversation.conversationId,
      linkedAt: conversation.linkedAt,
    };

    await db.insert(schema.widgetConversations).values(raw);
  }

  async getConversationsBySession(tenantId: string, sessionId: string): Promise<WidgetConversation[]> {
    const rows = await db
      .select()
      .from(schema.widgetConversations)
      .where(and(
        eq(schema.widgetConversations.tenantId, tenantId),
        eq(schema.widgetConversations.widgetSessionId, sessionId)
      ));

    return rows.map((row) => new WidgetConversation(row.id, {
      tenantId: row.tenantId,
      widgetSessionId: row.widgetSessionId,
      conversationId: row.conversationId,
      linkedAt: row.linkedAt,
    }));
  }

  async getConversationLinksByConversationId(tenantId: string, conversationId: string): Promise<WidgetConversation[]> {
    const rows = await db
      .select()
      .from(schema.widgetConversations)
      .where(and(
        eq(schema.widgetConversations.tenantId, tenantId),
        eq(schema.widgetConversations.conversationId, conversationId)
      ));

    return rows.map((row) => new WidgetConversation(row.id, {
      tenantId: row.tenantId,
      widgetSessionId: row.widgetSessionId,
      conversationId: row.conversationId,
      linkedAt: row.linkedAt,
    }));
  }

  // ------------ Widget Auth Token ------------
  async saveAuthToken(authToken: WidgetAuthToken): Promise<void> {
    const raw = {
      id: authToken.id,
      tenantId: authToken.tenantId,
      visitorId: authToken.visitorId,
      tokenHash: authToken.tokenHash,
      expiresAt: authToken.expiresAt,
      lastUsedAt: authToken.lastUsedAt || null,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetAuthTokens)
      .where(and(
        eq(schema.widgetAuthTokens.tenantId, authToken.tenantId),
        eq(schema.widgetAuthTokens.id, authToken.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetAuthTokens)
        .set(raw)
        .where(eq(schema.widgetAuthTokens.id, authToken.id));
    } else {
      await db.insert(schema.widgetAuthTokens).values(raw);
    }
  }

  async getAuthToken(tenantId: string, tokenHash: string): Promise<WidgetAuthToken | null> {
    const [row] = await db
      .select()
      .from(schema.widgetAuthTokens)
      .where(and(
        eq(schema.widgetAuthTokens.tenantId, tenantId),
        eq(schema.widgetAuthTokens.tokenHash, tokenHash)
      ));

    if (!row) return null;

    return new WidgetAuthToken(row.id, {
      tenantId: row.tenantId,
      visitorId: row.visitorId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      lastUsedAt: row.lastUsedAt || undefined,
    });
  }

  async deleteAuthToken(tenantId: string, tokenHash: string): Promise<void> {
    await db
      .delete(schema.widgetAuthTokens)
      .where(and(
        eq(schema.widgetAuthTokens.tenantId, tenantId),
        eq(schema.widgetAuthTokens.tokenHash, tokenHash)
      ));
  }

  // ------------ Widget Installation ------------
  async saveInstallation(installation: WidgetInstallation): Promise<void> {
    const raw = {
      id: installation.id,
      tenantId: installation.tenantId,
      domain: installation.domain,
      status: installation.status,
      verificationToken: installation.verificationToken,
      verifiedAt: installation.verifiedAt || null,
      updatedAt: new Date(),
      version: installation.version,
    };

    const [existing] = await db
      .select()
      .from(schema.widgetInstallations)
      .where(and(
        eq(schema.widgetInstallations.tenantId, installation.tenantId),
        eq(schema.widgetInstallations.id, installation.id)
      ));

    if (existing) {
      await db
        .update(schema.widgetInstallations)
        .set(raw)
        .where(eq(schema.widgetInstallations.id, installation.id));
    } else {
      await db.insert(schema.widgetInstallations).values({
        ...raw,
        createdAt: installation.createdAt,
      });
    }
  }

  async getInstallationById(tenantId: string, id: string): Promise<WidgetInstallation | null> {
    const [row] = await db
      .select()
      .from(schema.widgetInstallations)
      .where(and(
        eq(schema.widgetInstallations.tenantId, tenantId),
        eq(schema.widgetInstallations.id, id)
      ));

    if (!row) return null;

    return new WidgetInstallation(row.id, {
      tenantId: row.tenantId,
      domain: row.domain,
      status: row.status,
      verificationToken: row.verificationToken,
      verifiedAt: row.verifiedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async getInstallationByDomain(tenantId: string, domain: string): Promise<WidgetInstallation | null> {
    const [row] = await db
      .select()
      .from(schema.widgetInstallations)
      .where(and(
        eq(schema.widgetInstallations.tenantId, tenantId),
        eq(schema.widgetInstallations.domain, domain)
      ));

    if (!row) return null;

    return new WidgetInstallation(row.id, {
      tenantId: row.tenantId,
      domain: row.domain,
      status: row.status,
      verificationToken: row.verificationToken,
      verifiedAt: row.verifiedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version,
    });
  }

  async hasAnyInstallation(tenantId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: schema.widgetInstallations.id })
      .from(schema.widgetInstallations)
      .where(eq(schema.widgetInstallations.tenantId, tenantId))
      .limit(1);
    return !!row;
  }
}
