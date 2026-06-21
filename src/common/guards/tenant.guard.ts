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
      // Consume EasyDev IAM API to validate the JWT and ensure the user belongs to the Tenant
      // Example: POST http://easydev-iam-service/v1/validate
      const iamResponse = await this.validateWithIam(authHeader, tenantId);
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

  private async validateWithIam(token: string, tenantId: string): Promise<any> {
    const iamUrl = process.env.EASYDEV_IAM_URL;

    if (!iamUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('EASYDEV_IAM_URL is not configured');
      }
      // Local dev fallback only: no IAM service configured.
      return {
        isValid: true,
        userId: 'user-123',
        roles: ['support_agent', 'tenant_admin'],
      };
    }

    const res = await axios.post(
      `${iamUrl}/v1/validate`,
      { token, tenantId },
      { timeout: 3000 },
    );
    return res.data;
  }
}
