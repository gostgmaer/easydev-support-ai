import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantValidationService {
  async validateTenant(tenantId: string): Promise<boolean> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return false;
    }
    return true;
  }
}
