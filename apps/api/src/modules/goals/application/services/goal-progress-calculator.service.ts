import type {
  GoalForecastConfidence,
  GoalMilestoneType,
  GoalTrend,
  GoalType,
} from '../../domain/goals.types';

export const GOAL_PROGRESS_CALCULATOR_VERSION = 'goal-deterministic-v1';

export interface GoalProgressCalculationInput {
  goalType: GoalType;
  startValue?: number;
  currentValue?: number;
  targetValue?: number;
  adherenceScore?: number;
  recoveryScore?: number;
  consistencyScore?: number;
}

export interface GoalProgressHistoryPoint {
  progressPercentage: number;
}

export interface GoalProgressCalculationContext
  extends GoalProgressCalculationInput {
  previousSnapshots?: GoalProgressHistoryPoint[];
}

export interface GoalForecastCalculationResult {
  predictedCompletionDays: number;
  confidence: GoalForecastConfidence;
}

export interface GoalMilestoneProgress {
  type: GoalMilestoneType;
  title: string;
  targetValue: number;
  achieved: boolean;
  progressPercentage: number;
}

export interface GoalProgressCalculationResult {
  progressPercentage: number;
  trend: GoalTrend;
  forecast: GoalForecastCalculationResult;
  milestones: GoalMilestoneProgress[];
}

export class GoalProgressCalculatorService {
  calculate(
    input: GoalProgressCalculationContext,
  ): GoalProgressCalculationResult {
    const progressPercentage = this.calculateProgress(input);
    const previousSnapshots = input.previousSnapshots ?? [];
    const trend = this.calculateTrend(progressPercentage, previousSnapshots);
    const forecast = this.calculateForecast(
      progressPercentage,
      trend,
      previousSnapshots,
      input,
    );

    return {
      progressPercentage,
      trend,
      forecast,
      milestones: this.buildMilestones(input.goalType, progressPercentage),
    };
  }

  calculateProgress(input: GoalProgressCalculationInput): number {
    switch (input.goalType) {
      case 'lose_weight':
        return this.resolveWeightProgress({
          direction: 'down',
          startValue: input.startValue,
          currentValue: input.currentValue,
          targetValue: input.targetValue,
          fallback: this.resolveFallbackProgress(input),
        });
      case 'gain_muscle':
        return this.resolveWeightProgress({
          direction: 'up',
          startValue: input.startValue,
          currentValue: input.currentValue,
          targetValue: input.targetValue,
          fallback: this.resolveFallbackProgress(input),
        });
      case 'maintain_weight':
        return this.calculateMaintainWeightProgress(input);
      case 'improve_consistency':
        return this.clampProgress(
          this.resolveScore(
            input.consistencyScore,
            this.resolveFallbackProgress(input),
          ),
        );
      case 'improve_recovery':
        return this.clampProgress(
          this.resolveScore(
            input.recoveryScore,
            this.resolveFallbackProgress(input),
          ),
        );
      default:
        return this.resolveFallbackProgress(input);
    }
  }

  calculateTrend(
    currentProgress: number,
    previousSnapshots: GoalProgressHistoryPoint[] = [],
  ): GoalTrend {
    if (previousSnapshots.length === 0) {
      return 'stable';
    }

    const average =
      previousSnapshots.reduce(
        (total, snapshot) => total + snapshot.progressPercentage,
        0,
      ) / previousSnapshots.length;

    const difference = currentProgress - average;

    if (difference >= 5) {
      return 'improving';
    }

    if (difference <= -5) {
      return 'declining';
    }

    return 'stable';
  }

  calculateForecast(
    currentProgress: number,
    trend: GoalTrend,
    previousSnapshots: GoalProgressHistoryPoint[] = [],
    input?: GoalProgressCalculationInput,
  ): GoalForecastCalculationResult {
    if (currentProgress >= 100) {
      return {
        predictedCompletionDays: 0,
        confidence: 'high',
      };
    }

    const history = [...previousSnapshots.map((snapshot) => snapshot.progressPercentage), currentProgress];
    const deltas = this.calculateDeltas(history);
    const averageDelta = this.average(deltas);
    const volatility = this.average(deltas.map((delta) => Math.abs(delta)));
    const supportScore = this.average([
      this.resolveScore(input?.adherenceScore, 50),
      this.resolveScore(input?.recoveryScore, 50),
      this.resolveScore(input?.consistencyScore, 50),
    ]);

    const pace = Math.max(
      0.25,
      Math.abs(averageDelta) * (supportScore / 100) || 0.25,
    );
    const predictedCompletionDays = Math.min(
      3650,
      Math.max(1, Math.ceil((100 - currentProgress) / pace)),
    );

    return {
      predictedCompletionDays,
      confidence: this.calculateForecastConfidence({
        historyLength: previousSnapshots.length,
        volatility,
        trend,
      }),
    };
  }

  buildMilestones(
    goalType: GoalType,
    progressPercentage: number,
  ): GoalMilestoneProgress[] {
    const thresholds = [25, 50, 75, 100];
    const targetType = this.resolveMilestoneType(goalType);

    return thresholds.map((targetValue) => ({
      type: targetType,
      title: `${targetValue}% goal milestone`,
      targetValue,
      achieved: progressPercentage >= targetValue,
      progressPercentage,
    }));
  }

  private calculateMaintainWeightProgress(
    input: GoalProgressCalculationInput,
  ): number {
    const hasStartValue = typeof input.startValue === 'number';
    const hasCurrentValue = typeof input.currentValue === 'number';

    if (
      hasStartValue &&
      hasCurrentValue &&
      Number.isFinite(input.startValue) &&
      Number.isFinite(input.currentValue)
    ) {
      const startValue = input.startValue as number;
      const currentValue = input.currentValue as number;
      const tolerance = Math.max(Math.abs(startValue) * 0.05, 1);
      const deviation = Math.abs(currentValue - startValue);
      const stability = 100 - Math.min(100, (deviation / tolerance) * 100);
      const adherence = this.resolveScore(input.adherenceScore, 50);
      const consistency = this.resolveScore(input.consistencyScore, 50);

      return this.clampProgress(
        (stability * 0.5 + adherence * 0.25 + consistency * 0.25),
      );
    }

    return this.resolveFallbackProgress(input);
  }

  private resolveWeightProgress(input: {
    direction: 'down' | 'up';
    startValue?: number;
    currentValue?: number;
    targetValue?: number;
    fallback: number;
  }): number {
    const hasStartValue = typeof input.startValue === 'number';
    const hasCurrentValue = typeof input.currentValue === 'number';
    const hasTargetValue = typeof input.targetValue === 'number';

    if (
      !hasStartValue ||
      !hasCurrentValue ||
      !hasTargetValue ||
      !Number.isFinite(input.startValue) ||
      !Number.isFinite(input.currentValue) ||
      !Number.isFinite(input.targetValue)
    ) {
      return input.fallback;
    }

    const startValue = input.startValue as number;
    const currentValue = input.currentValue as number;
    const targetValue = input.targetValue as number;

    const denominator =
      input.direction === 'down'
        ? startValue - targetValue
        : targetValue - startValue;

    if (denominator <= 0) {
      const hasReachedTarget =
        input.direction === 'down'
          ? currentValue <= targetValue
          : currentValue >= targetValue;

      return hasReachedTarget ? 100 : 0;
    }

    const numerator =
      input.direction === 'down'
        ? startValue - currentValue
        : currentValue - startValue;

    return this.clampProgress((numerator / denominator) * 100);
  }

  private calculateForecastConfidence(input: {
    historyLength: number;
    volatility: number;
    trend: GoalTrend;
  }): GoalForecastConfidence {
    if (input.historyLength < 3) {
      return 'low';
    }

    if (input.trend === 'declining' || input.volatility > 12) {
      return 'low';
    }

    if (input.historyLength >= 7 && input.volatility <= 5) {
      return 'high';
    }

    return 'medium';
  }

  private calculateDeltas(history: number[]): number[] {
    if (history.length < 2) {
      return [];
    }

    const deltas: number[] = [];

    for (let index = 1; index < history.length; index += 1) {
      deltas.push(history[index] - history[index - 1]);
    }

    return deltas;
  }

  private resolveFallbackProgress(input: GoalProgressCalculationInput): number {
    const scores = [
      input.adherenceScore,
      input.recoveryScore,
      input.consistencyScore,
    ].filter((value): value is number => typeof value === 'number');

    if (scores.length === 0) {
      return 50;
    }

    return this.clampProgress(this.average(scores));
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    return this.clampProgress(value as number);
  }

  private clampProgress(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  private resolveMilestoneType(goalType: GoalType): GoalMilestoneType {
    switch (goalType) {
      case 'lose_weight':
      case 'gain_muscle':
      case 'maintain_weight':
        return 'weight_target';
      case 'improve_consistency':
        return 'streak';
      case 'improve_recovery':
      default:
        return 'recovery';
    }
  }
}
