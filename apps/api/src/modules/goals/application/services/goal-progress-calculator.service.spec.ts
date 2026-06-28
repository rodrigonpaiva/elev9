import { GoalProgressCalculatorService } from './goal-progress-calculator.service';

describe('GoalProgressCalculatorService', () => {
  let service: GoalProgressCalculatorService;

  beforeEach(() => {
    service = new GoalProgressCalculatorService();
  });

  describe('weight loss', () => {
    it.each([
      [100, 100, 80, 0],
      [100, 95, 80, 25],
      [100, 90, 80, 50],
      [100, 85, 80, 75],
      [100, 80, 80, 100],
    ])(
      'calculates %s -> %s against %s as %s',
      (startValue, currentValue, targetValue, expected) => {
        const result = service.calculateProgress({
          goalType: 'lose_weight',
          startValue,
          currentValue,
          targetValue,
        });

        expect(result).toBe(expected);
      },
    );
  });

  describe('muscle gain', () => {
    it.each([
      [80, 80, 100, 0],
      [80, 85, 100, 25],
      [80, 90, 100, 50],
      [80, 95, 100, 75],
      [80, 100, 100, 100],
    ])(
      'calculates %s -> %s against %s as %s',
      (startValue, currentValue, targetValue, expected) => {
        const result = service.calculateProgress({
          goalType: 'gain_muscle',
          startValue,
          currentValue,
          targetValue,
        });

        expect(result).toBe(expected);
      },
    );
  });

  describe('consistency', () => {
    it('uses consistency score for low progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_consistency',
          consistencyScore: 30,
        }),
      ).toBe(30);
    });

    it('uses consistency score for medium progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_consistency',
          consistencyScore: 55,
        }),
      ).toBe(55);
    });

    it('uses consistency score for high progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_consistency',
          consistencyScore: 90,
        }),
      ).toBe(90);
    });
  });

  describe('recovery', () => {
    it('uses recovery score for low progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_recovery',
          recoveryScore: 25,
        }),
      ).toBe(25);
    });

    it('uses recovery score for medium progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_recovery',
          recoveryScore: 60,
        }),
      ).toBe(60);
    });

    it('uses recovery score for high progress', () => {
      expect(
        service.calculateProgress({
          goalType: 'improve_recovery',
          recoveryScore: 85,
        }),
      ).toBe(85);
    });
  });

  describe('clamp', () => {
    it('clamps below zero', () => {
      expect(
        service.calculateProgress({
          goalType: 'lose_weight',
          startValue: 100,
          currentValue: 120,
          targetValue: 80,
        }),
      ).toBe(0);
    });

    it('clamps above 100', () => {
      expect(
        service.calculateProgress({
          goalType: 'gain_muscle',
          startValue: 80,
          currentValue: 110,
          targetValue: 100,
        }),
      ).toBe(100);
    });
  });

  describe('trend', () => {
    it('returns improving', () => {
      expect(
        service.calculateTrend(40, [
          { progressPercentage: 20 },
          { progressPercentage: 25 },
          { progressPercentage: 30 },
        ]),
      ).toBe('improving');
    });

    it('returns stable', () => {
      expect(
        service.calculateTrend(31, [
          { progressPercentage: 30 },
          { progressPercentage: 31 },
          { progressPercentage: 32 },
        ]),
      ).toBe('stable');
    });

    it('returns declining', () => {
      expect(
        service.calculateTrend(20, [
          { progressPercentage: 30 },
          { progressPercentage: 28 },
          { progressPercentage: 26 },
        ]),
      ).toBe('declining');
    });
  });

  describe('forecast', () => {
    it('returns low confidence', () => {
      const result = service.calculateForecast(
        30,
        'stable',
        [{ progressPercentage: 28 }],
        {
          goalType: 'improve_consistency',
          consistencyScore: 30,
        },
      );

      expect(result.confidence).toBe('low');
      expect(result.predictedCompletionDays).toBeGreaterThan(0);
    });

    it('returns medium confidence', () => {
      const result = service.calculateForecast(
        40,
        'stable',
        [
          { progressPercentage: 20 },
          { progressPercentage: 28 },
          { progressPercentage: 33 },
          { progressPercentage: 36 },
        ],
        {
          goalType: 'improve_consistency',
          consistencyScore: 60,
        },
      );

      expect(result.confidence).toBe('medium');
      expect(result.predictedCompletionDays).toBeGreaterThan(0);
    });

    it('returns high confidence', () => {
      const result = service.calculateForecast(
        70,
        'improving',
        [
          { progressPercentage: 50 },
          { progressPercentage: 55 },
          { progressPercentage: 60 },
          { progressPercentage: 63 },
          { progressPercentage: 65 },
          { progressPercentage: 68 },
          { progressPercentage: 69 },
        ],
        {
          goalType: 'improve_consistency',
          consistencyScore: 90,
        },
      );

      expect(result.confidence).toBe('high');
      expect(result.predictedCompletionDays).toBeGreaterThan(0);
    });
  });

  describe('milestones', () => {
    it.each([25, 50, 75, 100])('marks %s milestone thresholds', (target) => {
      const result = service.buildMilestones('lose_weight', 80);

      expect(result.map((item) => item.targetValue)).toEqual([25, 50, 75, 100]);
      expect(result.find((item) => item.targetValue === target)).toBeDefined();
    });
  });
});
