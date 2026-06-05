import { PlatformDateService } from './platform-date.service';

describe('PlatformDateService', () => {
  const service = new PlatformDateService();

  it('returns a YYYY-MM-DD string in UTC', () => {
    expect(
      service.getTodayDateString(new Date('2026-06-02T23:59:59.999Z')),
    ).toBe('2026-06-02');
    expect(service.getDateString(new Date('2026-06-03T00:00:00.000Z'))).toBe(
      '2026-06-03',
    );
  });

  it('computes a UTC day range', () => {
    expect(service.getUtcDayRange('2026-06-02')).toEqual({
      start: new Date('2026-06-02T00:00:00.000Z'),
      end: new Date('2026-06-03T00:00:00.000Z'),
    });
  });

  it('rejects invalid UTC date strings', () => {
    expect(() => service.getUtcDayRange('2026-06-02T12:00:00Z')).toThrow(
      'Invalid UTC date string: 2026-06-02T12:00:00Z',
    );
  });
});
