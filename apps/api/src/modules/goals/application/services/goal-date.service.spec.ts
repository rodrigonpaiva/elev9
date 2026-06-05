import { GoalDateService } from './goal-date.service';

describe('GoalDateService', () => {
  const service = new GoalDateService();

  it('delegates UTC date formatting and date arithmetic', () => {
    expect(
      service.todayUtcDateString(new Date('2026-06-02T23:59:59.999Z')),
    ).toBe('2026-06-02');
    expect(service.getDateString(new Date('2026-06-03T00:00:00.000Z'))).toBe(
      '2026-06-03',
    );
    expect(service.addDaysToDateString('2026-06-03', -2)).toBe('2026-06-01');
  });
});
