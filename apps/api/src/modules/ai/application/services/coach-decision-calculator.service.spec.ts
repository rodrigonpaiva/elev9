import { CoachDecisionCalculatorService } from './coach-decision-calculator.service';

describe('CoachDecisionCalculatorService', () => {
  let service: CoachDecisionCalculatorService;

  beforeEach(() => {
    service = new CoachDecisionCalculatorService();
  });

  it('selects recovery by readiness', () => {
    const result = service.calculate({
      readinessScore: 30,
      fatigueScore: 20,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('recovery');
    expect(result.headline).toContain('Recovery');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_READINESS',
    );
    expect(result.actionItems.length).toBeGreaterThanOrEqual(2);
    expect(result.actionItems.length).toBeLessThanOrEqual(3);
  });

  it('selects recovery by fatigue', () => {
    const result = service.calculate({
      readinessScore: 70,
      fatigueScore: 82,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('recovery');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'HIGH_FATIGUE',
    );
  });

  it('selects recovery by rest day adaptive recommendation', () => {
    const result = service.calculate({
      readinessScore: 80,
      fatigueScore: 20,
      adaptiveRecommendationType: 'rest_day',
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('recovery');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'REST_DAY_RECOMMENDED',
    );
  });

  it('selects nutrition priority', () => {
    const result = service.calculate({
      readinessScore: 75,
      fatigueScore: 20,
      nutritionAdherence: 35,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('nutrition');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_NUTRITION_ADHERENCE',
    );
    expect(result.headline).toBe('Nutrition is the priority today');
  });

  it('selects training priority for increase intensity', () => {
    const result = service.calculate({
      readinessScore: 82,
      fatigueScore: 24,
      nutritionAdherence: 72,
      adaptiveRecommendationType: 'increase_intensity',
      adaptiveIntensity: 'hard',
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('training');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'INCREASE_INTENSITY_RECOMMENDED',
    );
    expect(result.headline).toBe('Training adaptation recommended');
  });

  it('selects training priority for decrease intensity', () => {
    const result = service.calculate({
      readinessScore: 78,
      fatigueScore: 22,
      nutritionAdherence: 68,
      adaptiveRecommendationType: 'decrease_intensity',
      adaptiveIntensity: 'light',
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('training');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'DECREASE_INTENSITY_RECOMMENDED',
    );
  });

  it('selects consistency priority', () => {
    const result = service.calculate({
      readinessScore: 68,
      fatigueScore: 32,
      nutritionAdherence: 68,
      currentStreak: 1,
      missedWorkouts: 2,
    });

    expect(result.priority).toBe('consistency');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'LOW_TRAINING_ADHERENCE',
    );
  });

  it('adds goal decline signals and selects consistency when no crisis exists', () => {
    const result = service.calculate({
      readinessScore: 68,
      fatigueScore: 30,
      nutritionAdherence: 72,
      goalProgressPercentage: 48,
      goalTrend: 'declining',
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('consistency');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOAL_PROGRESS_DECLINING',
    );
  });

  it('adds goal improvement signals without overriding the default motivation path', () => {
    const result = service.calculate({
      readinessScore: 72,
      fatigueScore: 28,
      nutritionAdherence: 74,
      goalProgressPercentage: 62,
      goalTrend: 'improving',
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('motivation');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOAL_PROGRESS_IMPROVING',
    );
  });

  it('adds low confidence goal signals and keeps consistency when context is not strong enough for motivation', () => {
    const result = service.calculate({
      readinessScore: 70,
      fatigueScore: 26,
      nutritionAdherence: 72,
      goalProgressPercentage: 44,
      goalForecastConfidence: 'low',
      currentStreak: 0,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('consistency');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOAL_FORECAST_LOW_CONFIDENCE',
    );
  });

  it('adds milestone and achievement signals and uses motivation when no crisis exists', () => {
    const milestoneResult = service.calculate({
      readinessScore: 74,
      fatigueScore: 24,
      nutritionAdherence: 76,
      goalProgressPercentage: 78,
      goalMilestoneClose: true,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(milestoneResult.priority).toBe('motivation');
    expect(
      milestoneResult.influences.map((influence) => influence.code),
    ).toContain('GOAL_MILESTONE_CLOSE');

    const achievementResult = service.calculate({
      readinessScore: 76,
      fatigueScore: 22,
      nutritionAdherence: 78,
      goalProgressPercentage: 100,
      goalAchievementReached: true,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(achievementResult.priority).toBe('motivation');
    expect(
      achievementResult.influences.map((influence) => influence.code),
    ).toContain('GOAL_ACHIEVEMENT_REACHED');
  });

  it('uses notification fatigue signals to favor consistency when no stronger signal exists', () => {
    const result = service.calculate({
      readinessScore: 68,
      fatigueScore: 30,
      nutritionAdherence: 72,
      notificationSuppressed: true,
      notificationFatigueHigh: true,
      notificationDismissedFrequently: true,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('consistency');
    expect(result.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining([
        'NOTIFICATION_SUPPRESSED',
        'NOTIFICATION_FATIGUE_HIGH',
        'NOTIFICATION_DISMISSED_FREQUENTLY',
      ]),
    );
  });

  it('uses notification engagement signals to reinforce motivation when no stronger signal exists', () => {
    const result = service.calculate({
      readinessScore: 72,
      fatigueScore: 28,
      nutritionAdherence: 74,
      notificationHighEngagement: true,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('motivation');
    expect(result.influences.map((influence) => influence.code)).toContain(
      'NOTIFICATION_HIGH_ENGAGEMENT',
    );
  });

  it('does not let goal signals override a recovery crisis', () => {
    const result = service.calculate({
      readinessScore: 24,
      fatigueScore: 88,
      nutritionAdherence: 82,
      goalProgressPercentage: 84,
      goalTrend: 'declining',
      goalForecastConfidence: 'low',
      goalMilestoneClose: true,
      goalAchievementReached: true,
      habitConsistencyScore: 32,
      habitTrend: 'declining',
      habitRiskLevel: 'high',
      habitConsistencyDeclining: true,
      habitRiskHigh: true,
      habitDropoutRisk: true,
      currentStreak: 6,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('recovery');
    expect(result.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining([
        'LOW_READINESS',
        'HIGH_FATIGUE',
        'GOAL_PROGRESS_DECLINING',
        'GOAL_FORECAST_LOW_CONFIDENCE',
        'GOAL_MILESTONE_CLOSE',
        'GOAL_ACHIEVEMENT_REACHED',
        'HABIT_CONSISTENCY_DECLINING',
        'HABIT_RISK_HIGH',
        'HABIT_DROPOUT_RISK',
      ]),
    );
  });

  it('adds habit decline and dropout signals and keeps consistency when no crisis exists', () => {
    const result = service.calculate({
      readinessScore: 70,
      fatigueScore: 30,
      nutritionAdherence: 72,
      habitConsistencyScore: 38,
      habitTrend: 'declining',
      habitRiskLevel: 'high',
      habitRiskHigh: true,
      habitConsistencyDeclining: true,
      habitDropoutRisk: true,
      habitCurrentStreak: 1,
      currentStreak: 1,
      missedWorkouts: 1,
    });

    expect(result.priority).toBe('consistency');
    expect(result.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining([
        'HABIT_CONSISTENCY_DECLINING',
        'HABIT_RISK_HIGH',
        'HABIT_DROPOUT_RISK',
      ]),
    );
  });

  it('adds habit improving and strong streak signals and uses motivation when no crisis exists', () => {
    const result = service.calculate({
      readinessScore: 76,
      fatigueScore: 24,
      nutritionAdherence: 78,
      habitConsistencyScore: 84,
      habitTrend: 'improving',
      habitRiskLevel: 'low',
      habitConsistencyImproving: true,
      habitStreakStrong: true,
      habitCurrentStreak: 6,
      currentStreak: 4,
      missedWorkouts: 0,
    });

    expect(result.priority).toBe('motivation');
    expect(result.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining([
        'HABIT_CONSISTENCY_IMPROVING',
        'HABIT_STREAK_STRONG',
      ]),
    );
  });

  it('falls back to motivation', () => {
    const result = service.calculate({});

    expect(result.priority).toBe('motivation');
    expect(result.headline).toBe('Keep building momentum');
    expect(result.actionItems.length).toBe(2);
  });

  it('keeps summary within 250 chars', () => {
    const result = service.calculate({
      readinessScore: 20,
      fatigueScore: 90,
      nutritionAdherence: 20,
      adaptiveRecommendationType: 'rest_day',
      currentStreak: 0,
      missedWorkouts: 4,
    });

    expect(result.summary.length).toBeLessThanOrEqual(250);
  });

  it('returns positive and negative influences when applicable', () => {
    const result = service.calculate({
      readinessScore: 86,
      fatigueScore: 24,
      nutritionAdherence: 82,
      adaptiveRecommendationType: 'increase_volume',
      currentStreak: 6,
      missedWorkouts: 0,
    });

    expect(result.influences.some((influence) => influence.impact === 'positive')).toBe(true);
    expect(result.influences.map((influence) => influence.code)).toContain(
      'HIGH_NUTRITION_ADHERENCE',
    );
    expect(result.influences.map((influence) => influence.code)).toContain(
      'GOOD_CONSISTENCY',
    );
  });

  it('uses neutral fallbacks without forcing negative signals', () => {
    const result = service.calculate({
      adaptiveIntensity: 'moderate',
    });

    expect(result.priority).toBe('motivation');
    expect(result.formulaVersion).toBe('coach-decision-v1');
    expect(result.headline).toBe('Keep building momentum');
  });
});
