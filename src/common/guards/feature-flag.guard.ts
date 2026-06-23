import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_FEATURE_KEY } from '../decorators/feature-flag.decorator';
import { FeatureFlagService } from '../../modules/settings/services/feature-flag.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];

    const enabled = await this.featureFlagService.resolveFlag(
      tenantId,
      requiredFeature,
    );

    if (!enabled) {
      throw new ForbiddenException(
        `This feature ("${requiredFeature}") isn't included in your current plan. Upgrade your plan or contact billing to enable it.`,
      );
    }

    return true;
  }
}
