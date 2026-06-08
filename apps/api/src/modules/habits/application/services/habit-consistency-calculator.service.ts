import type {
  ConsistencySummaryContract,
  HabitRiskSignalContract,
} from '../../domain/habits.contract';
import type {
  ConsistencyTrend,
  HabitRiskLevel,
  RiskSignalType,
} from '../../domain/habits.types';

export const HABIT_ENGINE_CALCULATOR_VERSION = 'habit-engine-v1';

export interface HabitConsistencyCalculationInput {
  userProfileId: string;
  generatedAt: string;
  workoutCompletionRate?: number;
  checkInCompletionRate?: number;
  recoveryAdherence?: number;
  goalProgressScore?: number;
  notificationEngagementScore?: number;
  consecutiveSuccessfulDays?: number;
  longestStreak?: number;
  inactivityDays?: number;
  previousScore?: number;
}

export interface HabitConsistencyCalculationResult {
  consistencyScore: number;
  trend: ConsistencyTrend;
  streakDays: number;
  longestStreak: number;
  adherenceRate: number;
  riskLevel: HabitRiskLevel;
  riskSignals: HabitRiskSignalContract[];
  summary: ConsistencySummaryContract;
  formulaVersion: string;
}

type WeightedInput = {
  value?: number;
  weight: number;
};

export class HabitConsistencyCalculatorService {
  calculate(
    input: HabitConsistencyCalculationInput,
  ): HabitConsistencyCalculationResult {
    const consistencyScore = this.calculateConsistencyScore(input);
    const streakDays = this.calculateStreakDays(
      input.consecutiveSuccessfulDays,
    );
    const longestStreak = Math.max(
      streakDays,
      this.resolveCount(input.longestStreak, streakDays),
    );
    const adherenceRate = this.calculateAdherenceRate(input);
    const trend = this.calculateTrend(
      consistencyScore,
      input.previousScore,
    );
    const riskLevel = this.calculateRiskLevel({
      consistencyScore,
      trend,
      streakDays,
      inactivityDays: input.inactivityDays,
    });

    const riskSignals = this.buildRiskSignals({
      userProfileId: input.userProfileId,
      generatedAt: input.generatedAt,
      consistencyScore,
      trend,
      streakDays,
      inactivityDays: input.inactivityDays,
    });

    return {
      consistencyScore,
      trend,
      streakDays,
      longestStreak,
      adherenceRate,
      riskLevel,
      riskSignals,
      summary: {
        userProfileId: input.userProfileId,
        score: consistencyScore,
        trend,
        currentStreak: streakDays,
        longestStreak,
        adherenceRate,
        riskLevel,
        updatedAt: input.generatedAt,
        formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
      },
      formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
    };
  }

  calculateConsistencyScore(input: HabitConsistencyCalculationInput): number {
    const weightedInputs: WeightedInput[] = [
      {
        value: input.workoutCompletionRate,
        weight: 35,
      },
      {
        value: input.checkInCompletionRate,
        weight: 20,
      },
      {
        value: input.recoveryAdherence,
        weight: 15,
      },
      {
        value: input.goalProgressScore,
        weight: 20,
      },
      {
        value: input.notificationEngagementScore,
        weight: 10,
      },
    ];

    const total = weightedInputs.reduce((sum, item) => {
      return sum + this.resolveScore(item.value, 50) * item.weight;
    }, 0);

    return this.clampScore(total / 100);
  }

  calculateTrend(
    currentScore: number,
    previousScore?: number,
  ): ConsistencyTrend {
    if (typeof previousScore !== 'number' || Number.isNaN(previousScore)) {
      return 'stable';
    }

    const delta = currentScore - this.clampScore(previousScore);

    if (delta >= 5) {
      return 'improving';
    }

    if (delta <= -5) {
      return 'declining';
    }

    return 'stable';
  }

  calculateStreakDays(consecutiveSuccessfulDays?: number): number {
    return this.resolveCount(consecutiveSuccessfulDays, 0);
  }

  calculateRiskLevel(input: {
    consistencyScore: number;
    trend: ConsistencyTrend;
    streakDays: number;
    inactivityDays?: number;
  }): HabitRiskLevel {
    const inactivityDays = this.resolveCount(input.inactivityDays, 0);

    if (
      (input.streakDays === 0 && input.consistencyScore < 40) ||
      inactivityDays >= 7
    ) {
      return 'high';
    }

    if (input.consistencyScore < 60 || inactivityDays >= 3) {
      return 'medium';
    }

    return 'low';
  }

  buildRiskSignals(input: {
    userProfileId: string;
    generatedAt: string;
    consistencyScore: number;
    trend: ConsistencyTrend;
    streakDays: number;
    inactivityDays?: number;
  }): HabitRiskSignalContract[] {
    const riskSignals: HabitRiskSignalContract[] = [];
    const inactivityDays = this.resolveCount(input.inactivityDays, 0);

    if (inactivityDays >= 3) {
      riskSignals.push({
        userProfileId: input.userProfileId,
        type: 'inactivity_pattern',
        level: inactivityDays >= 7 ? 'high' : 'medium',
        title: 'Inactivity pattern detected',
        description: `Activity has been inconsistent for ${inactivityDays} days.`,
        generatedAt: input.generatedAt,
        formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
      });
    }

    if (input.streakDays <= 2 && input.consistencyScore < 60) {
      riskSignals.push({
        userProfileId: input.userProfileId,
        type: 'streak_at_risk',
        level:
          input.streakDays === 0 && input.consistencyScore < 40
            ? 'high'
            : 'medium',
        title: 'Streak at risk',
        description: 'The current streak is short and needs reinforcement.',
        generatedAt: input.generatedAt,
        formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
      });
    }

    if (input.trend === 'declining') {
      riskSignals.push({
        userProfileId: input.userProfileId,
        type: 'declining_consistency',
        level: input.consistencyScore < 40 ? 'high' : 'medium',
        title: 'Consistency is declining',
        description: 'Recent consistency is lower than the prior baseline.',
        generatedAt: input.generatedAt,
        formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
      });
    }

    if (input.consistencyScore < 40 && input.trend === 'declining') {
      riskSignals.push({
        userProfileId: input.userProfileId,
        type: 'dropout_risk',
        level: 'high',
        title: 'Dropout risk detected',
        description:
          'Low consistency combined with a declining trend indicates dropout risk.',
        generatedAt: input.generatedAt,
        formulaVersion: HABIT_ENGINE_CALCULATOR_VERSION,
      });
    }

    return riskSignals;
  }

  private calculateAdherenceRate(
    input: HabitConsistencyCalculationInput,
  ): number {
    const weightedInputs: WeightedInput[] = [
      {
        value: input.workoutCompletionRate,
        weight: 35,
      },
      {
        value: input.checkInCompletionRate,
        weight: 20,
      },
      {
        value: input.recoveryAdherence,
        weight: 15,
      },
    ];

    const totalWeight = weightedInputs.reduce((sum, item) => sum + item.weight, 0);
    const total = weightedInputs.reduce((sum, item) => {
      return sum + this.resolveScore(item.value, 50) * item.weight;
    }, 0);

    return this.clampScore(total / totalWeight);
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return this.clampScore(fallback);
    }

    return this.clampScore(value);
  }

  private resolveCount(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(0, Math.floor(value));
  }

  private clampScore(value: number): number {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return 50;
    }

    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
