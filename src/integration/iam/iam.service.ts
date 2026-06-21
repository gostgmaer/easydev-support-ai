import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class IamIntegrationService {
  private readonly logger = new Logger(IamIntegrationService.name);

  // Calls the EasyDev IAM Service
  async validateTokenAndGetTenant(
    token: string,
  ): Promise<{ tenantId: string; userId: string }> {
    const iamUrl = process.env.EASYDEV_IAM_URL;

    if (!iamUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('EASYDEV_IAM_URL is not configured');
      }
      this.logger.warn(
        'EASYDEV_IAM_URL not configured; using local dev fallback identity',
      );
      return {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-89b-12d3',
      };
    }

    const res = await axios.post(
      `${iamUrl}/v1/validate`,
      { token },
      { timeout: 3000 },
    );
    if (!res.data?.isValid) {
      throw new UnauthorizedException('IAM validation failed');
    }
    return { tenantId: res.data.tenantId, userId: res.data.userId };
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const iamUrl = process.env.EASYDEV_IAM_URL;

    if (!iamUrl) {
      return process.env.NODE_ENV !== 'production';
    }

    try {
      const res = await axios.post(
        `${iamUrl}/v1/users/${userId}/permissions/check`,
        { permission },
        { timeout: 3000 },
      );
      return !!res.data?.allowed;
    } catch {
      return false;
    }
  }
}
