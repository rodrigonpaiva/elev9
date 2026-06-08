import { HabitConsistencyCalculatorService } from './habit-consistency-calculator.service';

describe('HabitConsistencyCalculatorService', () => {
  let service: HabitConsistencyCalculatorService;

  beforeEach(() => {
    service = new HabitConsistencyCalculatorService();
  });

  describe('consistency score', () => {
    it.each([
      [0, 0],
      [25, 25],
      [50, 50],
      [75, 75],
      [100, 100],
    ])('calculates %s as %s', (value, expected) => {
      expect(
        service.calculateConsistencyScore({
          userProfileId: 'profile_123',
          generatedAt: '2026-06-03T10:00:00.000Z',
          workoutCompletionRate: value,
          checkInCompletionRate: value,
          recoveryAdherence: value,
          goalProgressScore: value,
          notificationEngagementScore: value,
        }),
      ).toBe(expected);
    });
  });

  describe('trend', () => {
    it('returns improving', () => {
      expect(service.calculateTrend(60, 54)).toBe('improving');
    });

    it('returns stable', () => {
      expect(service.calculateTrend(55, 52)).toBe('stable');
    });

    it('returns declining', () => {
      expect(service.calculateTrend(50, 60)).toBe('declining');
    });
  });

  describe('risk', () => {
    it('returns low', () => {
      expect(
        service.calculateRiskLevel({
          consistencyScore: 80,
          trend: 'stable',
          streakDays: 7,
          inactivityDays: 1,
        }),
      ).toBe('low');
    });

    it('returns medium', () => {
      expect(
        service.calculateRiskLevel({
          consistencyScore: 55,
          trend: 'stable',
          streakDays: 3,
          inactivityDays: 3,
        }),
      ).toBe('medium');
    });

    it('returns high', () => {
      expect(
        service.calculateRiskLevel({
          consistencyScore: 35,
          trend: 'declining',
          streakDays: 0,
          inactivityDays: 1,
        }),
      ).toBe('high');
    });
  });

  describe('risk signals', () => {
    it('returns inactivity pattern signals', () => {
      const riskSignals = service.buildRiskSignals({
        userProfileId: 'profile_123',
        generatedAt: '2026-06-03T10:00:00.000Z',
        consistencyScore: 70,
        trend: 'stable',
        streakDays: 5,
        inactivityDays: 3,
      });

      expect(riskSignals.map((signal) => signal.type)).toContain(
        'inactivity_pattern',
      );
    });

    it('returns streak risk signals', () => {
      const riskSignals = service.buildRiskSignals({
        userProfileId: 'profile_123',
        generatedAt: '2026-06-03T10:00:00.000Z',
        consistencyScore: 55,
        trend: 'stable',
        streakDays: 2,
        inactivityDays: 1,
      });

      expect(riskSignals.map((signal) => signal.type)).toContain(
        'streak_at_risk',
      );
    });

    it('returns declining consistency signals', () => {
      const riskSignals = service.buildRiskSignals({
        userProfileId: 'profile_123',
        generatedAt: '2026-06-03T10:00:00.000Z',
        consistencyScore: 55,
        trend: 'declining',
        streakDays: 4,
        inactivityDays: 1,
      });

      expect(riskSignals.map((signal) => signal.type)).toContain(
        'declining_consistency',
      );
    });

    it('returns dropout risk signals', () => {
      const riskSignals = service.buildRiskSignals({
        userProfileId: 'profile_123',
        generatedAt: '2026-06-03T10:00:00.000Z',
        consistencyScore: 30,
        trend: 'declining',
        streakDays: 0,
        inactivityDays: 8,
      });

      expect(riskSignals.map((signal) => signal.type)).toContain(
        'dropout_risk',
      );
    });
  });

  describe('clamp', () => {
    it('clamps below 0', () => {
      expect(
        service.calculateConsistencyScore({
          userProfileId: 'profile_123',
          generatedAt: '2026-06-03T10:00:00.000Z',
          workoutCompletionRate: -20,
          checkInCompletionRate: -20,
          recoveryAdherence: -20,
          goalProgressScore: -20,
          notificationEngagementScore: -20,
        }),
      ).toBe(0);
    });

    it('clamps above 100', () => {
      expect(
        service.calculateConsistencyScore({
          userProfileId: 'profile_123',
          generatedAt: '2026-06-03T10:00:00.000Z',
          workoutCompletionRate: 150,
          checkInCompletionRate: 150,
          recoveryAdherence: 150,
          goalProgressScore: 150,
          notificationEngagementScore: 150,
        }),
      ).toBe(100);
    });
  });

  describe('summary', () => {
    it('builds a deterministic consistency summary', () => {
      const result = service.calculate({
        userProfileId: 'profile_123',
        generatedAt: '2026-06-03T10:00:00.000Z',
        workoutCompletionRate: 75,
        checkInCompletionRate: 75,
        recoveryAdherence: 75,
        goalProgressScore: 75,
        notificationEngagementScore: 75,
        consecutiveSuccessfulDays: 6,
        longestStreak: 10,
        inactivityDays: 1,
        previousScore: 70,
      });

      expect(result.formulaVersion).toBe('habit-engine-v1');
      expect(result.summary.userProfileId).toBe('profile_123');
      expect(result.summary.score).toBe(75);
      expect(result.summary.trend).toBe('improving');
      expect(result.summary.currentStreak).toBe(6);
      expect(result.summary.longestStreak).toBe(10);
      expect(result.summary.adherenceRate).toBe(75);
      expect(result.summary.riskLevel).toBe('low');
      expect(result.summary.updatedAt).toBe('2026-06-03T10:00:00.000Z');
      expect(result.summary.formulaVersion).toBe('habit-engine-v1');
    });
  });
});
