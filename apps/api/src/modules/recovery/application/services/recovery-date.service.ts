import { Injectable } from '@nestjs/common';

import { PlatformDateService } from '../../../../shared/date/platform-date.service';

@Injectable()
export class RecoveryDateService {
  constructor(
    private readonly platformDateService: PlatformDateService = new PlatformDateService(),
  ) {}

  todayUtcDateString(now: Date = new Date()): string {
    return this.platformDateService.getTodayDateString(now);
  }

  getDateString(date: Date, timezone = 'UTC'): string {
    if (timezone === 'UTC') {
      return this.platformDateService.getDateString(date);
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .replace(/\//g, '-');
  }

  getUtcDayRange(dateString: string): { start: Date; end: Date } {
    return this.platformDateService.getUtcDayRange(dateString);
  }
}
