import { NotificationDecisionCalculatorService } from './notification-decision-calculator.service';

describe('NotificationDecisionCalculatorService', () => {
  const service = new NotificationDecisionCalculatorService();

  it('returns a recovery alert for low readiness', () => {
    const result = service.calculate({
      readinessScore: 20,
      fatigueLevel: 'medium',
    });

    expect(result.type).toBe('recovery_alert');
    expect(result.priority).toBe('urgent');
    expect(result.channel).toBe('in_app');
    expect(result.status).toBe('planned');
    expect(result.title).toBe('Recovery needed today');
    expect(result.formulaVersion).toBe('notification-engine-v1');
    expect(result.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining(['MEDIUM_FATIGUE', 'LOW_READINESS']),
    );
  });

  it('returns a recovery alert for high fatigue', () => {
    const result = service.calculate({
      fatigueScore: 92,
      fatigueLevel: 'high',
    });

    expect(result.type).toBe('recovery_alert');
    expect(result.priority).toBe('urgent');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'HIGH_FATIGUE',
    );
  });

  it('returns a recovery alert for rest_day recommendations', () => {
    const result = service.calculate({
      adaptiveRecommendationType: 'rest_day',
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('recovery_alert');
    expect(result.priority).toBe('urgent');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'REST_DAY_RECOMMENDED',
    );
  });

  it('returns goal achievement notifications', () => {
    const result = service.calculate({
      goalAchievementReached: true,
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('goal_achievement');
    expect(result.priority).toBe('high');
    expect(result.title).toBe('Goal achieved');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOAL_ACHIEVED',
    );
  });

  it('returns milestone notifications when the goal is close', () => {
    const result = service.calculate({
      goalMilestoneClose: true,
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('goal_milestone');
    expect(result.priority).toBe('high');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOAL_MILESTONE_CLOSE',
    );
  });

  it('returns missed workout notifications for repeated misses', () => {
    const result = service.calculate({
      missedWorkouts: 2,
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('missed_workout');
    expect(result.priority).toBe('medium');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'MISSED_WORKOUTS',
    );
  });

  it('returns missed workout notifications for inactivity', () => {
    const result = service.calculate({
      noRecentActivity: true,
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('missed_workout');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_ENGAGEMENT',
    );
  });

  it('returns nutrition reminders for low adherence', () => {
    const result = service.calculate({
      nutritionAdherence: 20,
      fatigueLevel: 'medium',
    });

    expect(result.type).toBe('nutrition_reminder');
    expect(result.priority).toBe('medium');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_NUTRITION_ADHERENCE',
    );
  });

  it('returns coach nudges for consistency signals', () => {
    const result = service.calculate({
      coachDecisionPriority: 'consistency',
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('coach_nudge');
    expect(result.priority).toBe('medium');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'COACH_CONSISTENCY_NUDGE',
    );
  });

  it('returns coach nudges for motivation signals', () => {
    const result = service.calculate({
      coachDecisionPriority: 'motivation',
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('coach_nudge');
    expect(result.priority).toBe('medium');
  });

  it('falls back to a weekly summary', () => {
    const result = service.calculate({
      fatigueLevel: 'low',
    });

    expect(result.type).toBe('weekly_summary');
    expect(result.priority).toBe('low');
    expect(result.title).toBe('Your weekly summary is ready');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_ENGAGEMENT',
    );
  });

  it('classifies fatigue influence as low', () => {
    const result = service.calculate({
      fatigueLevel: 'low',
    });

    expect(result.influences[0].code).toBe('LOW_FATIGUE');
    expect(result.influences[0].source).toBe('recovery');
  });

  it('classifies fatigue influence as medium', () => {
    const result = service.calculate({
      fatigueLevel: 'medium',
    });

    expect(result.influences[0].code).toBe('MEDIUM_FATIGUE');
  });

  it('classifies fatigue influence as high', () => {
    const result = service.calculate({
      fatigueLevel: 'high',
    });

    expect(result.influences[0].code).toBe('HIGH_FATIGUE');
  });

  it('keeps the channel and status fixed for the MVP', () => {
    const result = service.calculate({
      fatigueLevel: 'low',
    });

    expect(result.channel).toBe('in_app');
    expect(result.status).toBe('planned');
  });

  it('keeps messages within the length limit', () => {
    const result = service.calculate({
      fatigueLevel: 'low',
    });

    expect(result.message.length).toBeLessThanOrEqual(250);
  });

  it('keeps the first matching signal as the winner', () => {
    const result = service.calculate({
      readinessScore: 10,
      goalAchievementReached: true,
      fatigueLevel: 'high',
    });

    expect(result.type).toBe('recovery_alert');
    expect(result.priority).toBe('urgent');
  });
});
