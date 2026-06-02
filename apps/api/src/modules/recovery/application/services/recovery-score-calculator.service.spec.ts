import { RecoveryScoreCalculatorService } from './recovery-score-calculator.service';

describe('RecoveryScoreCalculatorService', () => {
  const service = new RecoveryScoreCalculatorService();

  it('returns high readiness with strong signals', () => {
    const result = service.calculate({
      sleepQuality: 5,
      energyLevel: 5,
      muscleSoreness: 1,
      adherenceScore: 95,
      recentWorkoutLoad: 10,
      currentStreak: 6,
      missedWorkouts: 0,
      previousReadinessScores: [78, 80, 82],
    });

    expect(result.readinessScore).toBeGreaterThanOrEqual(80);
    expect(result.recoveryTrend).toBe('improving');
    expect(result.recommendedIntensity).toBe('hard');
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_ADHERENCE' }),
        expect.objectContaining({ code: 'RECENT_WORKOUT_COMPLETION' }),
        expect.objectContaining({ code: 'LONG_STREAK' }),
      ]),
    );
  });

  it('returns low readiness with poor signals', () => {
    const result = service.calculate({
      sleepQuality: 1,
      energyLevel: 1,
      muscleSoreness: 5,
      adherenceScore: 20,
      recentWorkoutLoad: 90,
      currentStreak: 1,
      missedWorkouts: 3,
      previousReadinessScores: [55, 54, 53],
    });

    expect(result.readinessScore).toBeLessThanOrEqual(39);
    expect(result.recoveryTrend).toBe('declining');
    expect(result.recommendedIntensity).toBe('recovery');
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'LOW_SLEEP' }),
        expect.objectContaining({ code: 'LOW_ENERGY' }),
        expect.objectContaining({ code: 'HIGH_MUSCLE_SORENESS' }),
        expect.objectContaining({ code: 'LOW_ADHERENCE' }),
        expect.objectContaining({ code: 'HIGH_WORKOUT_LOAD' }),
        expect.objectContaining({ code: 'MISSED_WORKOUTS' }),
      ]),
    );
  });

  it('returns high fatigue when load and soreness are high and sleep is poor', () => {
    const result = service.calculate({
      sleepQuality: 1,
      energyLevel: 2,
      muscleSoreness: 5,
      adherenceScore: 70,
      recentWorkoutLoad: 85,
      currentStreak: 4,
      missedWorkouts: 1,
    });

    expect(result.fatigueScore).toBeGreaterThanOrEqual(70);
  });

  it('returns low fatigue when load is light and recovery signals are good', () => {
    const result = service.calculate({
      sleepQuality: 5,
      energyLevel: 5,
      muscleSoreness: 1,
      adherenceScore: 90,
      recentWorkoutLoad: 5,
      currentStreak: 3,
      missedWorkouts: 0,
    });

    expect(result.fatigueScore).toBeLessThanOrEqual(39);
  });

  it('returns stable trend when the readiness difference is small', () => {
    const result = service.calculate({
      sleepQuality: 3,
      energyLevel: 3,
      muscleSoreness: 3,
      adherenceScore: 45,
      recentWorkoutLoad: 50,
      previousReadinessScores: [48, 49, 50],
    });

    expect(result.recoveryTrend).toBe('stable');
  });

  it('returns improving trend when readiness rises at least five points above the historical average', () => {
    const result = service.calculate({
      sleepQuality: 5,
      energyLevel: 5,
      muscleSoreness: 1,
      adherenceScore: 95,
      recentWorkoutLoad: 10,
      previousReadinessScores: [60, 62, 58],
    });

    expect(result.recoveryTrend).toBe('improving');
  });

  it('returns declining trend when readiness falls at least five points below the historical average', () => {
    const result = service.calculate({
      sleepQuality: 1,
      energyLevel: 1,
      muscleSoreness: 5,
      adherenceScore: 20,
      recentWorkoutLoad: 90,
      previousReadinessScores: [70, 72, 69],
    });

    expect(result.recoveryTrend).toBe('declining');
  });

  it('maps recommended intensity thresholds correctly', () => {
    expect(
      service.calculate({
        sleepQuality: 1,
        energyLevel: 1,
        muscleSoreness: 5,
        adherenceScore: 10,
        recentWorkoutLoad: 100,
      }).recommendedIntensity,
    ).toBe('recovery');

    expect(
      service.calculate({
        sleepQuality: 3,
        energyLevel: 3,
        muscleSoreness: 3,
        adherenceScore: 45,
        recentWorkoutLoad: 50,
      }).recommendedIntensity,
    ).toBe('light');

    expect(
      service.calculate({
        sleepQuality: 4,
        energyLevel: 4,
        muscleSoreness: 2,
        adherenceScore: 65,
        recentWorkoutLoad: 30,
      }).recommendedIntensity,
    ).toBe('moderate');

    expect(
      service.calculate({
        sleepQuality: 5,
        energyLevel: 5,
        muscleSoreness: 1,
        adherenceScore: 95,
        recentWorkoutLoad: 5,
      }).recommendedIntensity,
    ).toBe('hard');
  });

  it('clamps output scores to the 0-100 range', () => {
    const result = service.calculate({
      sleepQuality: 999,
      energyLevel: -10,
      muscleSoreness: 500,
      adherenceScore: 1000,
      recentWorkoutLoad: -400,
      missedWorkouts: 20,
      currentStreak: 100,
      previousReadinessScores: [200, -20, 130],
    });

    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
    expect(result.fatigueScore).toBeGreaterThanOrEqual(0);
    expect(result.fatigueScore).toBeLessThanOrEqual(100);
  });

  it('supports partial input with safe fallbacks', () => {
    const result = service.calculate({});

    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
    expect(result.fatigueScore).toBeGreaterThanOrEqual(0);
    expect(result.fatigueScore).toBeLessThanOrEqual(100);
    expect(result.recoveryTrend).toBe('stable');
    expect(result.recommendedIntensity).toBeDefined();
  });
});
