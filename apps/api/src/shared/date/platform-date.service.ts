import { Injectable } from '@nestjs/common';

const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;
const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class PlatformDateService {
  getTodayDateString(now: Date = new Date()): string {
    return this.getDateString(now);
  }

  getDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  getUtcDayRange(dateString: string): { start: Date; end: Date } {
    this.assertValidDateString(dateString);

    const start = new Date(`${dateString}T00:00:00.000Z`);
    const end = new Date(start.getTime() + UTC_DAY_IN_MS);

    return { start, end };
  }

  private assertValidDateString(dateString: string): void {
    if (!UTC_DATE_PATTERN.test(dateString)) {
      throw new Error(`Invalid UTC date string: ${dateString}`);
    }

    const parsed = new Date(`${dateString}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid UTC date string: ${dateString}`);
    }

    if (this.getDateString(parsed) !== dateString) {
      throw new Error(`Invalid UTC date string: ${dateString}`);
    }
  }
}
