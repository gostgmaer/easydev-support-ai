import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { BrandingSettings } from '../domain/entities';
import { UpdateBrandingDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BrandingService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getBranding(tenantId: string): Promise<BrandingSettings> {
    let branding = await this.settingsRepo.getBranding(tenantId);
    if (!branding) {
      // Create defaults
      branding = new BrandingSettings(uuidv4(), {
        tenantId,
        primaryColor: '#1A73E8',
        secondaryColor: '#E8F0FE',
        themeMode: 'LIGHT',
      });
      await this.settingsRepo.saveBranding(branding);
    }
    return branding;
  }

  async updateBranding(
    tenantId: string,
    dto: UpdateBrandingDto,
  ): Promise<BrandingSettings> {
    const branding = await this.getBranding(tenantId);
    branding.update({
      logoUrl: dto.logoUrl !== undefined ? dto.logoUrl : branding.logoUrl,
      faviconUrl:
        dto.faviconUrl !== undefined ? dto.faviconUrl : branding.faviconUrl,
      primaryColor: dto.primaryColor || branding.primaryColor,
      secondaryColor: dto.secondaryColor || branding.secondaryColor,
      themeMode: dto.themeMode || branding.themeMode,
      emailHeader:
        dto.emailHeader !== undefined ? dto.emailHeader : branding.emailHeader,
      emailFooter:
        dto.emailFooter !== undefined ? dto.emailFooter : branding.emailFooter,
      customCss:
        dto.customCss !== undefined ? dto.customCss : branding.customCss,
    });

    await this.settingsRepo.saveBranding(branding);
    await this.eventPublisher.publish(
      tenantId,
      'branding.updated',
      branding.toJSON(),
    );
    return branding;
  }
}
