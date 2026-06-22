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

      // Attach the user identity and IAM roles to the request so RbacGuard can use it
      request.user = {
        id: iamResponse.userId,
        roles: iamResponse.roles, // e.g. ['tenant_admin', 'support_agent']
      };

      return true;
    } catch (e) {
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
      // Local dev fallback only: no IAM service configured.
      return {
        isValid: true,
        userId: 'user-123',
        roles: ['support_agent', 'tenant_admin'],
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
    return { isValid: true, userId: me.id, roles: me.roles };
  }
}
