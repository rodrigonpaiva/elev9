import { DailyCheckInDateService } from './daily-check-in-date.service';

describe('DailyCheckInDateService', () => {
  const service = new DailyCheckInDateService();

  it('resolves the local date at a timezone boundary', () => {
    const day = service.resolveDay(
      'Europe/Paris',
      new Date('2026-05-04T22:30:00.000Z'),
    );

    expect(day.localDate).toBe('2026-05-05');
    expect(day.timezone).toBe('Europe/Paris');
    expect(day.legacyDayStart).toBeUndefined();
  });

  it('uses the UTC fallback for an invalid or missing timezone', () => {
    const day = service.resolveDay(
      'Not/A-Timezone',
      new Date('2026-05-04T22:30:00.000Z'),
    );

    expect(day.timezone).toBe('UTC');
    expect(day.localDate).toBe('2026-05-04');
    expect(day.legacyDayStart?.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });
});
