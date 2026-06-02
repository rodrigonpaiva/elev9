import { AdaptiveTrainingRecommendationCalculatorService } from './adaptive-training-recommendation-calculator.service';

describe('AdaptiveTrainingRecommendationCalculatorService', () => {
  let service: AdaptiveTrainingRecommendationCalculatorService;

  beforeEach(() => {
    service = new AdaptiveTrainingRecommendationCalculatorService();
  });

  it('returns a progression recommendation for high readiness and low fatigue', () => {
    const result = service.calculate({
      readinessScore: 88,
      fatigueScore: 22,
      recoveryTrend: 'improving',
      recoveryRecommendedIntensity: 'hard',
      adherenceScore: 86,
      currentStreak: 6,
      missedWorkouts: 0,
      recentWorkoutLoad: 22,
      nutritionAdherence: 82,
    });

    expect(
      ['increase_intensity', 'increase_volume'] as const,
    ).toContain(result.recommendationType);
    expect(result.recommendedIntensity).toBe('hard');
    expect(result.volumeAction).toBe('increase');
    expect(result.reasoning).not.toBe('');
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_READINESS' }),
        expect.objectContaining({ code: 'LOW_FATIGUE' }),
        expect.objectContaining({ code: 'RECOVERY_TREND_IMPROVING' }),
        expect.objectContaining({ code: 'HIGH_ADHERENCE' }),
        expect.objectContaining({ code: 'LONG_STREAK' }),
        expect.objectContaining({ code: 'GOOD_NUTRITION_SUPPORT' }),
        expect.objectContaining({ code: 'RECENT_WORKOUT_LOAD_LOW' }),
      ]),
    );
  });

  it('returns a decrease recommendation when readiness is low', () => {
    const result = service.calculate({
      readinessScore: 42,
      fatigueScore: 48,
      recoveryTrend: 'stable',
      adherenceScore: 55,
      currentStreak: 1,
      missedWorkouts: 1,
      recentWorkoutLoad: 66,
      nutritionAdherence: 52,
    });

    expect(result.recommendationType).toBe('decrease_intensity');
    expect(result.volumeAction).toBe('decrease');
    expect(result.reasoning).not.toBe('');
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LOW_READINESS' }),
      ]),
    );
  });

  it('returns rest_day when readiness is very low and fatigue is very high', () => {
    const result = service.calculate({
      readinessScore: 18,
      fatigueScore: 92,
      recoveryTrend: 'declining',
      adherenceScore: 32,
      currentStreak: 0,
      missedWorkouts: 2,
      recentWorkoutLoad: 84,
      nutritionAdherence: 28,
    });

    expect(result.recommendationType).toBe('rest_day');
    expect(result.recommendedIntensity).toBe('recovery');
    expect(result.volumeAction).toBe('decrease');
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_FATIGUE' }),
        expect.objectContaining({ code: 'RECOVERY_TREND_DECLINING' }),
        expect.objectContaining({ code: 'LOW_ADHERENCE' }),
        expect.objectContaining({ code: 'MISSED_WORKOUTS' }),
        expect.objectContaining({ code: 'POOR_NUTRITION_SUPPORT' }),
        expect.objectContaining({ code: 'RECENT_WORKOUT_LOAD_HIGH' }),
      ]),
    );
  });

  it('returns recovery_workout or decrease_intensity when fatigue is high', () => {
    const result = service.calculate({
      readinessScore: 54,
      fatigueScore: 78,
      recoveryTrend: 'declining',
      adherenceScore: 62,
      currentStreak: 3,
      missedWorkouts: 0,
      recentWorkoutLoad: 72,
      nutritionAdherence: 56,
    });

    expect(['recovery_workout', 'decrease_intensity', 'decrease_volume']).toContain(
      result.recommendationType,
    );
    expect(['recovery', 'light', 'moderate']).toContain(
      result.recommendedIntensity,
    );
    expect(['decrease', 'maintain']).toContain(result.volumeAction);
  });

  it('returns maintain when signals are balanced', () => {
    const result = service.calculate({
      readinessScore: 68,
      fatigueScore: 44,
      recoveryTrend: 'stable',
      adherenceScore: 64,
      currentStreak: 2,
      missedWorkouts: 0,
      recentWorkoutLoad: 44,
      nutritionAdherence: 60,
    });

    expect(result.recommendationType).toBe('maintain');
    expect(result.volumeAction).toBe('maintain');
    expect(['light', 'moderate']).toContain(result.recommendedIntensity);
  });

  it('returns reschedule_workout for low adherence without high fatigue', () => {
    const result = service.calculate({
      readinessScore: 58,
      fatigueScore: 44,
      recoveryTrend: 'stable',
      adherenceScore: 38,
      currentStreak: 1,
      missedWorkouts: 1,
      recentWorkoutLoad: 48,
      nutritionAdherence: 54,
    });

    expect(result.recommendationType).toBe('reschedule_workout');
    expect(result.volumeAction).toBe('decrease');
  });

  it('uses the recovery recommended intensity when provided', () => {
    const result = service.calculate({
      readinessScore: 66,
      fatigueScore: 40,
      recoveryTrend: 'stable',
      recoveryRecommendedIntensity: 'hard',
      adherenceScore: 72,
      currentStreak: 4,
      missedWorkouts: 0,
      recentWorkoutLoad: 38,
      nutritionAdherence: 68,
    });

    expect(result.recommendedIntensity).toBe('hard');
  });

  it('uses neutral fallbacks with partial input', () => {
    const result = service.calculate({});

    expect(result.recommendationType).toBeDefined();
    expect(result.recommendedIntensity).toBeDefined();
    expect(result.volumeAction).toBeDefined();
    expect(result.reasoning).not.toBe('');
  });

  it('generates positive and negative recovery influences deterministically', () => {
    const result = service.calculate({
      readinessScore: 82,
      fatigueScore: 24,
      recoveryTrend: 'improving',
      adherenceScore: 88,
      currentStreak: 7,
      missedWorkouts: 1,
      recentWorkoutLoad: 22,
      nutritionAdherence: 85,
    });

    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_READINESS' }),
        expect.objectContaining({ code: 'RECOVERY_TREND_IMPROVING' }),
        expect.objectContaining({ code: 'HIGH_ADHERENCE' }),
        expect.objectContaining({ code: 'LONG_STREAK' }),
        expect.objectContaining({ code: 'MISSED_WORKOUTS' }),
        expect.objectContaining({ code: 'GOOD_NUTRITION_SUPPORT' }),
        expect.objectContaining({ code: 'RECENT_WORKOUT_LOAD_LOW' }),
      ]),
    );
  });
});
