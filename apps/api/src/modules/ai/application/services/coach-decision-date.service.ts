import { Injectable } from '@nestjs/common';

import { PlatformDateService } from '../../../../shared/date/platform-date.service';

@Injectable()
export class CoachDecisionDateService {
  constructor(
    private readonly platformDateService: PlatformDateService = new PlatformDateService(),
  ) {}

  todayUtcDateString(now = new Date()): string {
    return this.platformDateService.getTodayDateString(now);
  }

  getDateString(date: Date): string {
    return this.platformDateService.getDateString(date);
  }

  getUtcDayRange(dateString: string): { start: Date; end: Date } {
    return this.platformDateService.getUtcDayRange(dateString);
  }
}
