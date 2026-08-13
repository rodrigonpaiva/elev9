import { Injectable } from '@nestjs/common';

export const DAILY_CHECK_IN_FALLBACK_TIMEZONE = 'UTC';

export type DailyCheckInDay = {
  localDate: string;
  timezone: string;
  legacyDayStart?: Date;
  legacyDayEnd?: Date;
};

@Injectable()
export class DailyCheckInDateService {
  resolveTimezone(timezone?: string): string {
    const candidate = typeof timezone === 'string' ? timezone.trim() : '';

    if (!candidate) {
      return DAILY_CHECK_IN_FALLBACK_TIMEZONE;
    }

    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: candidate }).format();
      return candidate;
    } catch {
      return DAILY_CHECK_IN_FALLBACK_TIMEZONE;
    }
  }

  resolveDay(timezone?: string, now: Date = new Date()): DailyCheckInDay {
    const resolvedTimezone = this.resolveTimezone(timezone);
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: resolvedTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(now)
      .replace(/\//g, '-');

    const legacyDayStart =
      resolvedTimezone === 'UTC'
        ? new Date(`${localDate}T00:00:00.000Z`)
        : undefined;
    const legacyDayEnd = legacyDayStart
      ? new Date(legacyDayStart.getTime() + 24 * 60 * 60 * 1000)
      : undefined;

    return {
      localDate,
      timezone: resolvedTimezone,
      legacyDayStart,
      legacyDayEnd,
    };
  }
}
