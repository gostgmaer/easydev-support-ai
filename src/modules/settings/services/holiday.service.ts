import { Injectable, Inject } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { Holiday } from '../domain/entities';
import { SaveHolidayDto } from '../dtos/settings.dto';
import { SettingsEventPublisher } from './settings-event.publisher';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HolidayService {
  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
    private readonly eventPublisher: SettingsEventPublisher,
  ) {}

  async getHolidays(tenantId: string): Promise<Holiday[]> {
    return this.settingsRepo.getHolidays(tenantId);
  }

  async saveHoliday(tenantId: string, dto: SaveHolidayDto): Promise<Holiday> {
    const list = await this.getHolidays(tenantId);
    const dateParsed = new Date(dto.holidayDate);
    const existing = list.find(
      (h) =>
        h.holidayName.toLowerCase() === dto.holidayName.toLowerCase() &&
        h.holidayDate.getTime() === dateParsed.getTime(),
    );

    const holiday = existing
      ? new Holiday(existing.id, {
          tenantId,
          holidayName: dto.holidayName,
          holidayDate: dateParsed,
          isRecurring: dto.isRecurring,
          country: dto.country,
          region: dto.region,
          createdAt: existing.createdAt,
        })
      : new Holiday(uuidv4(), {
          tenantId,
          holidayName: dto.holidayName,
          holidayDate: dateParsed,
          isRecurring: dto.isRecurring,
          country: dto.country,
          region: dto.region,
        });

    await this.settingsRepo.saveHoliday(holiday);
    await this.eventPublisher.publish(
      tenantId,
      'holiday.created',
      holiday.toJSON(),
    );
    return holiday;
  }

  async deleteHoliday(tenantId: string, id: string): Promise<void> {
    await this.settingsRepo.deleteHoliday(id, tenantId);
    await this.eventPublisher.publish(tenantId, 'holiday.updated', {
      id,
      action: 'DELETED',
    });
  }
}
