import { Controller, Get, Headers, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { BrandingService } from '../../settings/services/branding.service';

/** Public, unauthenticated branding read surface for help-center and
 * customer-widget - the existing BrandingController requires an agent/admin
 * IAM role (TenantGuard + RbacGuard), which anonymous visitors never have.
 * Only ever returns the visual subset safe to expose to anyone (no email
 * template fields, no raw customCss). */
@ApiTags('Public Help Center')
@ApiHeader({ name: 'x-tenant-id', required: true })
@Controller('v1/public/branding')
export class PublicBrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @ApiOperation({ summary: "Get a tenant's public branding (logo/colors)" })
  @Get()
  async getPublicBranding(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Missing Tenant ID');
    }
    const branding = await this.brandingService.getBranding(tenantId);
    return {
      logoUrl: branding.logoUrl,
      faviconUrl: branding.faviconUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
    };
  }
}
