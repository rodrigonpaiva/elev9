import { NotificationFatiguePolicyService } from './notification-fatigue-policy.service';

describe('NotificationFatiguePolicyService', () => {
  let service: NotificationFatiguePolicyService;

  beforeEach(() => {
    service = new NotificationFatiguePolicyService();
  });

  it('returns low fatigue for sparse activity', () => {
    const result = service.evaluate(buildInput());

    expect(result.suppressed).toBe(false);
    expect(result.fatigueLevel).toBe('low');
    expect(result.reasons).toEqual([]);
  });

  it('classifies medium fatigue', () => {
    const result = service.evaluate({
      ...buildInput(),
      recentNotificationsCount: 3,
    });

    expect(result.fatigueLevel).toBe('medium');
  });

  it('classifies high fatigue', () => {
    const result = service.evaluate({
      ...buildInput(),
      recentNotificationsCount: 5,
    });

    expect(result.fatigueLevel).toBe('high');
  });

  it('suppresses when daily cap is reached', () => {
    const result = service.evaluate({
      ...buildInput(),
      recentNotificationsCount: 5,
    });

    expect(result.suppressed).toBe(true);
    expect(result.reasons).toContain('daily_cap_reached');
  });

  it('suppresses when same type cooldown is hit', () => {
    const result = service.evaluate({
      ...buildInput(),
      recentSameTypeCount: 2,
    });

    expect(result.suppressed).toBe(true);
    expect(result.reasons).toContain('same_type_cooldown');
  });

  it('suppresses when dismissals are high', () => {
    const result = service.evaluate({
      ...buildInput(),
      dismissedCount: 3,
    });

    expect(result.suppressed).toBe(true);
    expect(result.reasons).toContain('high_dismissal_ratio');
  });

  it('suppresses when engagement is already high for low priority', () => {
    const result = service.evaluate({
      ...buildInput(),
      engagementScore: 80,
      candidatePriority: 'low',
    });

    expect(result.suppressed).toBe(true);
    expect(result.reasons).toContain('already_engaged');
  });

  it('suppresses when notification is too recent for low priority', () => {
    const result = service.evaluate({
      ...buildInput(),
      hoursSinceLastNotification: 3,
      candidatePriority: 'low',
    });

    expect(result.suppressed).toBe(true);
    expect(result.reasons).toContain('recent_notification');
  });

  it('never suppresses urgent notifications', () => {
    const result = service.evaluate({
      ...buildInput(),
      candidatePriority: 'urgent',
      recentNotificationsCount: 10,
      recentSameTypeCount: 3,
      dismissedCount: 10,
      engagementScore: 100,
      hoursSinceLastNotification: 1,
    });

    expect(result.suppressed).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});

function buildInput() {
  return {
    candidateType: 'weekly_summary' as const,
    candidatePriority: 'low' as const,
    recentNotificationsCount: 0,
    recentSameTypeCount: 0,
    dismissedCount: 0,
    engagementScore: 50,
    hoursSinceLastNotification: 24,
  };
}
