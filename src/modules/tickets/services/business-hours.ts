export interface BusinessCalendar {
  /** 0 = Sunday ... 6 = Saturday. */
  workingDays: number[];
  /** Local working window, 24h clock. */
  startHour: number;
  endHour: number;
  /** ISO yyyy-mm-dd dates treated as non-working holidays. */
  holidays: Set<string>;
}

const DEFAULT_HOLIDAYS = (process.env.SLA_HOLIDAYS || '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

export const DEFAULT_BUSINESS_CALENDAR: BusinessCalendar = {
  workingDays: [1, 2, 3, 4, 5],
  startHour: parseInt(process.env.SLA_BUSINESS_START_HOUR || '9', 10),
  endHour: parseInt(process.env.SLA_BUSINESS_END_HOUR || '17', 10),
  holidays: new Set(DEFAULT_HOLIDAYS),
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isWorkingMoment(date: Date, calendar: BusinessCalendar): boolean {
  if (!calendar.workingDays.includes(date.getUTCDay())) return false;
  if (calendar.holidays.has(isoDate(date))) return false;
  const hour = date.getUTCHours();
  return hour >= calendar.startHour && hour < calendar.endHour;
}

/**
 * Adds the given number of minutes to a starting instant, counting only
 * business minutes (working days, working window, excluding holidays). Used by
 * the SLA engine for business-hours response/resolution targets.
 */
export function addBusinessMinutes(
  start: Date,
  minutes: number,
  calendar: BusinessCalendar = DEFAULT_BUSINESS_CALENDAR,
): Date {
  let remaining = minutes;
  const cursor = new Date(start.getTime());
  // Step in one-minute increments only while inside business windows; otherwise
  // jump to the next business-day start to keep the loop bounded.
  let guard = 0;
  const maxIterations = 60 * 24 * 366;
  while (remaining > 0 && guard < maxIterations) {
    guard += 1;
    if (isWorkingMoment(cursor, calendar)) {
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
      remaining -= 1;
    } else {
      cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    }
  }
  return cursor;
}

/**
 * Adds calendar minutes (24/7) — the default SLA mode.
 */
export function addCalendarMinutes(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60 * 1000);
}
