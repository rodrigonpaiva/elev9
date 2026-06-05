import { RecoveryDateService } from './recovery-date.service';

describe('RecoveryDateService', () => {
  const service = new RecoveryDateService();

  it('delegates UTC date formatting', () => {
    expect(
      service.todayUtcDateString(new Date('2026-06-02T23:59:59.999Z')),
    ).toBe('2026-06-02');
    expect(service.getDateString(new Date('2026-06-03T00:00:00.000Z'))).toBe(
      '2026-06-03',
    );
  });
});
