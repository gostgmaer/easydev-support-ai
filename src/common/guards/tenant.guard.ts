import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const authHeader = request.headers['authorization'];

    if (!tenantId || !authHeader) {
      throw new UnauthorizedException(
        'Missing Tenant ID or Authorization header',
      );
    }

    try {
      // Validate the JWT against the real IAM service and fetch the caller's identity.
      const iamResponse = await this.validateWithIam(authHeader);
      if (!iamResponse.isValid)
        throw new UnauthorizedException('IAM validation failed');

      // IAM authenticates the bearer token but has no idea which tenant this
      // request claims to act as - that's the caller-supplied x-tenant-id
      // header. Enforce that the token's own tenantId claim matches it, so
      // one tenant's valid credentials can never read/write another tenant's
      // data by simply changing the header. super_admin is a platform
      // operator role (see rbac.guard.ts's blanket bypass) and is exempt.
      if (
        !iamResponse.roles?.includes('super_admin') &&
        iamResponse.tenantId &&
        iamResponse.tenantId !== tenantId
      ) {
        throw new UnauthorizedException('Cross-tenant access attempt');
      }

      // Attach the user identity and IAM roles to the request so RbacGuard can use it
      request.user = {
        id: iamResponse.userId,
        roles: iamResponse.roles, // e.g. ['tenant_admin', 'support_agent']
      };

      return true;
    } catch {
      throw new UnauthorizedException(
        'Invalid IAM Token or cross-tenant access attempt',
      );
    }
  }

  private async validateWithIam(authHeader: string): Promise<any> {
    const iamUrl =
      process.env.EASYDEV_IAM_URL ||
      process.env.IAM_SERVICE_INTERNAL_URL ||
      process.env.IAM_SERVICE_URL;

    if (!iamUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('IAM service URL is not configured');
      }
      // Local dev fallback only: no IAM service configured. Nil UUID keeps
      // this valid wherever it flows into a uuid-typed column (e.g. audit_logs.user_id).
      // No tenantId claim to check here, so the cross-tenant guard above is a no-op.
      return {
        isValid: true,
        userId: '00000000-0000-0000-0000-000000000000',
        roles: ['support_agent', 'tenant_admin'],
        tenantId: undefined,
      };
    }

    // Same upstream /auth/me endpoint IamGatewayService uses — validated by the
    // real IAM service's own AuthGuard (signature, expiry, revocation), rather
    // than a /v1/validate contract that was never implemented anywhere.
    const res = await axios.get(`${iamUrl}/api/v1/iam/auth/me`, {
      headers: { authorization: authHeader },
      timeout: 3000,
    });
    const me = res.data?.data ?? res.data;
    // /auth/me's response body doesn't echo back tenantId (only tenantSlug),
    // and the access token's own payload is the only place it's carried. IAM
    // has already verified this token's signature/expiry by the time we get
    // a 200 here, so decoding (not re-verifying) it locally is safe.
    const tenantId = this.decodeTokenTenantId(authHeader);
    return { isValid: true, userId: me.id, roles: me.roles, tenantId };
  }

  private decodeTokenTenantId(authHeader: string): string | undefined {
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = token.split('.')[1];
      const json = Buffer.from(payload, 'base64url').toString('utf8');
      return JSON.parse(json).tenantId;
    } catch {
      return undefined;
    }
  }
}
