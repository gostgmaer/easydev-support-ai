import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { IWidgetRepository } from '../repositories/widget-repository.interface';
import {
  WidgetSession,
  WidgetVisitor,
  WidgetAuthToken,
  WidgetConversation,
} from '../domain/entities';
import { WidgetEventPublisher } from './widget-event.publisher';
import {
  WidgetSessionStartedEvent,
  WidgetSessionEndedEvent,
} from '@easydev/shared-events';
import { StartWidgetSessionDto } from '../dtos/widget.dto';
import { WidgetVisitorService } from './widget-visitor.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class WidgetSessionService {
  private readonly logger = new Logger(WidgetSessionService.name);
  private readonly tokenSecret =
    process.env.WIDGET_JWT_SECRET ||
    'easydev-widget-fallback-secret-key-123456';

  constructor(
    @Inject('IWidgetRepository')
    private readonly widgetRepo: IWidgetRepository,
    private readonly visitorService: WidgetVisitorService,
    private readonly eventPublisher: WidgetEventPublisher,
  ) {}

  async startSession(
    tenantId: string,
    dto: StartWidgetSessionDto,
  ): Promise<{ session: WidgetSession; token: string }> {
    await this.assertOriginAllowed(tenantId, dto.referrer);

    // 1. Resolve or create visitor
    const visitor = await this.visitorService.getOrCreateAnonymousVisitor(
      tenantId,
      dto.anonymousId,
    );

    // 2. Generate signed token
    const sessionId = uuidv4();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    const payload = JSON.stringify({
      tenantId,
      visitorId: visitor.id,
      sessionId,
      expiresAt,
    });
    const signature = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(payload)
      .digest('hex');
    const sessionToken =
      Buffer.from(payload).toString('base64url') + '.' + signature;

    // Hash token for database storage
    const tokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    // 3. Save session
    const session = new WidgetSession(sessionId, {
      tenantId,
      visitorId: visitor.id,
      sessionToken,
      ipAddressHash: dto.ipAddressHash,
      userAgent: dto.userAgent,
      deviceType: dto.deviceType,
      browser: dto.browser,
      os: dto.os,
      referrer: dto.referrer,
      landingPage: dto.landingPage,
    });

    await this.widgetRepo.saveSession(session);

    // 4. Save auth token rotation
    const authToken = new WidgetAuthToken(uuidv4(), {
      tenantId,
      visitorId: visitor.id,
      tokenHash,
      expiresAt: new Date(expiresAt),
    });
    await this.widgetRepo.saveAuthToken(authToken);

    await this.eventPublisher.publish(
      new WidgetSessionStartedEvent(tenantId, session.id, visitor.id),
    );

    return { session, token: sessionToken };
  }

  /** Enforces the tenant's domain allowlist (WidgetInstallation) once they've configured one.
   * `referrer` is the embedding page's document.referrer, captured client-side - it's the
   * only signal available for "which site loaded this iframe", since the HTTP Referer header
   * on the session-start request itself always reflects the widget's own origin. This is a
   * deterrent, not a hard guarantee: a page can strip its own referrer via Referrer-Policy or
   * a non-browser client can omit it. Tenants with zero installations registered yet (still
   * testing/onboarding) are left open rather than locked out before they've set anything up. */
  private async assertOriginAllowed(
    tenantId: string,
    referrer?: string,
  ): Promise<void> {
    const hasInstallations = await this.widgetRepo.hasAnyInstallation(tenantId);
    if (!hasInstallations) {
      return;
    }

    if (!referrer) {
      throw new ForbiddenException(
        'A verifiable referrer is required to start a widget session for this tenant',
      );
    }

    let hostname: string;
    try {
      hostname = new URL(referrer).hostname;
    } catch {
      throw new ForbiddenException('Invalid referrer');
    }

    const installation = await this.widgetRepo.getInstallationByDomain(
      tenantId,
      hostname,
    );
    if (!installation || installation.status !== 'ACTIVE') {
      throw new ForbiddenException(
        `Domain ${hostname} is not authorized to embed this widget`,
      );
    }
  }

  async endSession(tenantId: string, sessionId: string): Promise<void> {
    const session = await this.widgetRepo.getSessionById(tenantId, sessionId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    session.end();
    await this.widgetRepo.saveSession(session);

    // Revoke token hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(session.sessionToken)
      .digest('hex');
    await this.widgetRepo.deleteAuthToken(tenantId, tokenHash);

    await this.eventPublisher.publish(
      new WidgetSessionEndedEvent(tenantId, sessionId),
    );
  }

  async validateSessionToken(
    tenantId: string,
    token: string,
  ): Promise<{ visitorId: string; sessionId: string }> {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        throw new UnauthorizedException('Malformed token structure');
      }

      const payloadStr = Buffer.from(parts[0], 'base64url').toString();
      const signature = parts[1];

      const expectedSignature = crypto
        .createHmac('sha256', this.tokenSecret)
        .update(payloadStr)
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new UnauthorizedException('Invalid token signature');
      }

      const payload = JSON.parse(payloadStr);
      if (payload.tenantId !== tenantId) {
        throw new UnauthorizedException('Tenant mismatch');
      }

      if (payload.expiresAt < Date.now()) {
        throw new UnauthorizedException('Token has expired');
      }

      // Check database to ensure not revoked
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const dbToken = await this.widgetRepo.getAuthToken(tenantId, tokenHash);
      if (!dbToken || dbToken.isExpired()) {
        throw new UnauthorizedException('Token revoked or expired in DB');
      }

      // Update token usage
      dbToken.use();
      await this.widgetRepo.saveAuthToken(dbToken);

      return { visitorId: payload.visitorId, sessionId: payload.sessionId };
    } catch (e) {
      throw new UnauthorizedException('Token validation failed');
    }
  }

  async findSessionIdsByConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<string[]> {
    const links = await this.widgetRepo.getConversationLinksByConversationId(
      tenantId,
      conversationId,
    );
    return links.map((link) => link.widgetSessionId);
  }

  async findConversationIdsBySession(
    tenantId: string,
    sessionId: string,
  ): Promise<string[]> {
    const links = await this.widgetRepo.getConversationsBySession(
      tenantId,
      sessionId,
    );
    return links.map((link) => link.conversationId);
  }

  async linkConversation(
    tenantId: string,
    sessionId: string,
    conversationId: string,
  ): Promise<void> {
    await this.widgetRepo.saveConversation(
      new WidgetConversation(uuidv4(), {
        tenantId,
        widgetSessionId: sessionId,
        conversationId,
      }),
    );
  }
}
