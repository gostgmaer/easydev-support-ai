import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by the TenantGuard after validating with IAM Service

    if (!user || !user.roles) {
      throw new ForbiddenException('No roles found in user session');
    }

    // super_admin holds every system permission upstream (see auth.service.ts's
    // getUserPermissions) and is treated as a blanket bypass on this side too -
    // it would otherwise fail every literal @Roles(...) check that doesn't
    // spell out "super_admin" explicitly.
    if (user.roles.includes('super_admin')) {
      return true;
    }

    // Check if the user has at least one of the required roles (IAM cross-service alignment)
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
