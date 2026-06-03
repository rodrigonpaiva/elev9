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
