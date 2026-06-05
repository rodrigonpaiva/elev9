import { AdaptiveTrainingDateService } from './adaptive-training-date.service';

describe('AdaptiveTrainingDateService', () => {
  const service = new AdaptiveTrainingDateService();

  it('delegates UTC date formatting', () => {
    expect(
      service.todayUtcDateString(new Date('2026-06-02T23:59:59.999Z')),
    ).toBe('2026-06-02');
    expect(service.getDateString(new Date('2026-06-03T00:00:00.000Z'))).toBe(
      '2026-06-03',
    );
  });
});
