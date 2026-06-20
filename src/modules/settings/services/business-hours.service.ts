import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { BusinessHours } from '../domain/entities';
import { SaveBusinessHoursDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { BusinessHoursEngine } from '../engines/business-hours.engine';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BusinessHoursService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
    private readonly hoursEngine: BusinessHoursEngine,
  ) {}

  async getBusinessHours(tenantId: string): Promise<BusinessHours[]> {
    const list = await this.settingsRepo.getBusinessHours(tenantId);
    if (list.length === 0) {
      // Auto-provision standard 9-to-5 Mon-Fri business hours
      const defaults: BusinessHours[] = [];
      for (let day = 1; day <= 5; day++) {
        const hours = new BusinessHours(uuidv4(), {
          tenantId,
          dayOfWeek: day,
          startTime: '09:00:00',
          endTime: '17:00:00',
          isOpen: true,
          timezone: 'UTC',
        });
        await this.settingsRepo.saveBusinessHours(hours);
        defaults.push(hours);
      }
      return defaults;
    }
    return list;
  }

  async saveBusinessHours(
    tenantId: string,
    dto: SaveBusinessHoursDto,
  ): Promise<BusinessHours> {
    const hoursList = await this.getBusinessHours(tenantId);
    const existing = hoursList.find((h) => h.dayOfWeek === dto.dayOfWeek);

    const hours = existing
      ? new BusinessHours(existing.id, {
          tenantId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          isOpen: dto.isOpen,
          timezone: dto.timezone,
          createdAt: existing.createdAt,
        })
      : new BusinessHours(uuidv4(), {
          tenantId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
          endTime: dto.endTime,
          isOpen: dto.isOpen,
          timezone: dto.timezone,
        });

    await this.settingsRepo.saveBusinessHours(hours);
    await this.eventPublisher.publish(
      tenantId,
      'business_hours.updated',
      hours.toJSON(),
    );
    return hours;
  }

  async deleteBusinessHours(tenantId: string, id: string): Promise<void> {
    await this.settingsRepo.deleteBusinessHours(id, tenantId);
    await this.eventPublisher.publish(tenantId, 'business_hours.updated', {
      id,
      action: 'DELETED',
    });
  }

  async isOpenNow(tenantId: string): Promise<boolean> {
    return this.hoursEngine.isOpenNow(tenantId);
  }

  async getNextOpenTime(
    tenantId: string,
    referenceDate = new Date(),
  ): Promise<Date | null> {
    return this.hoursEngine.nextOpenTime(tenantId, referenceDate);
  }

  async calculateBusinessSla(
    tenantId: string,
    startDate: Date,
    durationSeconds: number,
  ): Promise<Date> {
    return this.hoursEngine.calculateBusinessTime(
      tenantId,
      startDate,
      durationSeconds,
    );
  }
}
