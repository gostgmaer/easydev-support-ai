import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { WidgetSessionService } from '../services/widget-session.service';

export interface WidgetSessionContext {
  tenantId: string;
  visitorId: string;
  sessionId: string;
}

/** Authenticates widget-facing endpoints via the per-visitor session token issued
 * by WidgetSessionService.startSession - the widget equivalent of TenantGuard's
 * IAM bearer token, since widget visitors never hold an IAM identity. */
@Injectable()
export class WidgetSessionGuard implements CanActivate {
  constructor(private readonly sessionService: WidgetSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const authHeader = request.headers['authorization'];

    if (!tenantId || !authHeader) {
      throw new UnauthorizedException('Missing Tenant ID or session token');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : authHeader;

    try {
      const { visitorId, sessionId } =
        await this.sessionService.validateSessionToken(tenantId, token);
      request.widgetSession = {
        tenantId,
        visitorId,
        sessionId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired widget session');
    }
  }
}
