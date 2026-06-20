import { Injectable, Logger } from '@nestjs/common';
import type { ISettingsRepository } from '../repositories/settings-repository.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class BusinessHoursEngine {
  private readonly logger = new Logger(BusinessHoursEngine.name);

  constructor(
    @Inject('ISettingsRepository')
    private readonly settingsRepo: ISettingsRepository,
  ) {}

  async isHoliday(tenantId: string, date: Date): Promise<boolean> {
    const holidays = await this.settingsRepo.getHolidays(tenantId);
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    for (const h of holidays) {
      const hDate = new Date(h.holidayDate);
      if (h.isRecurring) {
        if (hDate.getDate() === day && hDate.getMonth() === month) {
          return true;
        }
      } else {
        if (
          hDate.getDate() === day &&
          hDate.getMonth() === month &&
          hDate.getFullYear() === year
        ) {
          return true;
        }
      }
    }

    return false;
  }

  async isOpenNow(tenantId: string, date = new Date()): Promise<boolean> {
    if (await this.isHoliday(tenantId, date)) {
      return false;
    }

    const dayOfWeek = date.getDay();
    const hoursList = await this.settingsRepo.getBusinessHours(tenantId);
    const dayHours = hoursList.find((h) => h.dayOfWeek === dayOfWeek);

    if (!dayHours || !dayHours.isOpen) {
      return false;
    }

    // Convert current time to "HH:MM:ss" string to compare
    const currentTimeStr = this.getTimeString(date);
    return (
      currentTimeStr >= dayHours.startTime && currentTimeStr <= dayHours.endTime
    );
  }

  async nextOpenTime(tenantId: string, date: Date): Promise<Date | null> {
    const hoursList = await this.settingsRepo.getBusinessHours(tenantId);
    if (hoursList.length === 0) {
      return null;
    }

    const checkDate = new Date(date.getTime());
    for (let i = 0; i < 30; i++) {
      // Check up to 30 days ahead
      const isHoliday = await this.isHoliday(tenantId, checkDate);
      if (!isHoliday) {
        const dayOfWeek = checkDate.getDay();
        const dayHours = hoursList.find((h) => h.dayOfWeek === dayOfWeek);
        if (dayHours && dayHours.isOpen) {
          const openDate = this.getDateWithTime(checkDate, dayHours.startTime);
          if (openDate.getTime() > date.getTime()) {
            return openDate;
          }
          const closeDate = this.getDateWithTime(checkDate, dayHours.endTime);
          if (date.getTime() < closeDate.getTime()) {
            return openDate; // If we are currently inside or before, next open time starts at open
          }
        }
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return null;
  }

  async calculateBusinessTime(
    tenantId: string,
    startDate: Date,
    durationSeconds: number,
  ): Promise<Date> {
    const hoursList = await this.settingsRepo.getBusinessHours(tenantId);
    // If no business hours configured, treat all time as business hours
    if (hoursList.length === 0) {
      return new Date(startDate.getTime() + durationSeconds * 1000);
    }

    let current = new Date(startDate.getTime());
    let remaining = durationSeconds;

    // Limit iterations to prevent infinite loops (max 60 days)
    let daysSafety = 0;
    while (remaining > 0 && daysSafety < 60) {
      const isHoliday = await this.isHoliday(tenantId, current);
      if (isHoliday) {
        // Skip holiday
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        daysSafety++;
        continue;
      }

      const dayOfWeek = current.getDay();
      const dayHours = hoursList.find((h) => h.dayOfWeek === dayOfWeek);

      if (!dayHours || !dayHours.isOpen) {
        // Skip non-business day
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        daysSafety++;
        continue;
      }

      const openTime = this.getDateWithTime(current, dayHours.startTime);
      const closeTime = this.getDateWithTime(current, dayHours.endTime);

      if (current.getTime() < openTime.getTime()) {
        current = openTime;
      }

      if (current.getTime() >= closeTime.getTime()) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        daysSafety++;
        continue;
      }

      // Calculate how many seconds left in today's business window
      const secondsLeftInWindow =
        (closeTime.getTime() - current.getTime()) / 1000;

      if (remaining <= secondsLeftInWindow) {
        current = new Date(current.getTime() + remaining * 1000);
        remaining = 0;
      } else {
        remaining -= secondsLeftInWindow;
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
      }
      daysSafety++;
    }

    return current;
  }

  private getTimeString(date: Date): string {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private getDateWithTime(baseDate: Date, timeStr: string): Date {
    const [hh, mm, ss] = timeStr.split(':').map((x) => parseInt(x, 10));
    const newDate = new Date(baseDate.getTime());
    newDate.setHours(hh, mm, ss || 0, 0);
    return newDate;
  }
}
