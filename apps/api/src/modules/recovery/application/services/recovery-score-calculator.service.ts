import { Injectable } from '@nestjs/common';

import { FatigueScore } from '../../domain/value-objects/fatigue-score.value-object';
import {
  RecoveryInfluence,
  RecoveryInfluenceProps,
} from '../../domain/value-objects/recovery-influence.value-object';
import { RecoveryTrend } from '../../domain/value-objects/recovery-trend.value-object';
import { RecommendedIntensity } from '../../domain/value-objects/recommended-intensity.value-object';
import { ReadinessScore } from '../../domain/value-objects/readiness-score.value-object';

export const RECOVERY_SCORE_CALCULATOR_VERSION = 'recovery-deterministic-v1';

export type RecoveryScoreCalculatorInput = {
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  previousReadinessScores?: number[];
};

export type RecoveryScoreCalculatorOutput = {
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoveryTrend;
  recommendedIntensity: RecommendedIntensity;
  influences: RecoveryInfluence[];
};

const WEIGHTS = {
  readiness: {
    sleepQuality: 0.3,
    energyLevel: 0.3,
    muscleSoreness: 0.15,
    adherenceScore: 0.15,
    recentWorkoutLoad: 0.1,
    missedWorkoutsPenalty: 3,
    longStreakBonus: 1.5,
  },
  fatigue: {
    recentWorkoutLoad: 0.35,
    muscleSoreness: 0.3,
    energyLevel: 0.2,
    sleepQuality: 0.15,
    missedWorkoutsPenalty: 4,
    longStreakPenalty: 1,
  },
} as const;

@Injectable()
export class RecoveryScoreCalculatorService {
  calculate(input: RecoveryScoreCalculatorInput): RecoveryScoreCalculatorOutput {
    const hasSleepQuality = typeof input.sleepQuality === 'number';
    const hasEnergyLevel = typeof input.energyLevel === 'number';
    const hasMuscleSoreness = typeof input.muscleSoreness === 'number';
    const hasAdherenceScore = typeof input.adherenceScore === 'number';
    const hasRecentWorkoutLoad = typeof input.recentWorkoutLoad === 'number';
    const hasCurrentStreak = typeof input.currentStreak === 'number';
    const hasMissedWorkouts = typeof input.missedWorkouts === 'number';

    const sleepQuality = this.resolveFiveScale(input.sleepQuality);
    const energyLevel = this.resolveFiveScale(input.energyLevel);
    const muscleSoreness = this.resolveFiveScale(input.muscleSoreness);
    const adherenceScore = this.resolveScore(input.adherenceScore, 50);
    const recentWorkoutLoad = this.resolveScore(input.recentWorkoutLoad, 50);
    const currentStreak = this.resolveNonNegativeInteger(input.currentStreak);
    const missedWorkouts = this.resolveNonNegativeInteger(input.missedWorkouts);
    const previousReadinessScores = this.resolveScores(
      input.previousReadinessScores,
    );

    const readiness = this.calculateReadiness({
      sleepQuality,
      energyLevel,
      muscleSoreness,
      adherenceScore,
      recentWorkoutLoad,
      currentStreak,
      missedWorkouts,
    });
    const fatigue = this.calculateFatigue({
      sleepQuality,
      energyLevel,
      muscleSoreness,
      recentWorkoutLoad,
      currentStreak,
      missedWorkouts,
    });
    const recoveryTrend = this.calculateRecoveryTrend(
      readiness,
      previousReadinessScores,
    );
    const recommendedIntensity = this.mapRecommendedIntensity(readiness);
    const influences = this.buildInfluences({
      hasSleepQuality,
      hasEnergyLevel,
      hasMuscleSoreness,
      hasAdherenceScore,
      hasRecentWorkoutLoad,
      hasCurrentStreak,
      hasMissedWorkouts,
      sleepQuality,
      energyLevel,
      muscleSoreness,
      adherenceScore,
      recentWorkoutLoad,
      currentStreak,
      missedWorkouts,
    });

    return {
      readinessScore: new ReadinessScore(readiness).value,
      fatigueScore: new FatigueScore(fatigue).value,
      recoveryTrend,
      recommendedIntensity,
      influences,
    };
  }

  private calculateReadiness(input: {
    sleepQuality: number;
    energyLevel: number;
    muscleSoreness: number;
    adherenceScore: number;
    recentWorkoutLoad: number;
    currentStreak: number;
    missedWorkouts: number;
  }): number {
    const readiness =
      input.sleepQuality * WEIGHTS.readiness.sleepQuality +
      input.energyLevel * WEIGHTS.readiness.energyLevel +
      this.invertScore(input.muscleSoreness) * WEIGHTS.readiness.muscleSoreness +
      input.adherenceScore * WEIGHTS.readiness.adherenceScore +
      this.invertScore(input.recentWorkoutLoad) *
        WEIGHTS.readiness.recentWorkoutLoad +
      Math.min(10, input.currentStreak * WEIGHTS.readiness.longStreakBonus) -
      Math.min(15, input.missedWorkouts * WEIGHTS.readiness.missedWorkoutsPenalty);

    return this.clampScore(readiness);
  }

  private calculateFatigue(input: {
    sleepQuality: number;
    energyLevel: number;
    muscleSoreness: number;
    recentWorkoutLoad: number;
    currentStreak: number;
    missedWorkouts: number;
  }): number {
    const fatigue =
      input.recentWorkoutLoad * WEIGHTS.fatigue.recentWorkoutLoad +
      input.muscleSoreness * WEIGHTS.fatigue.muscleSoreness +
      this.invertScore(input.energyLevel) * WEIGHTS.fatigue.energyLevel +
      this.invertScore(input.sleepQuality) * WEIGHTS.fatigue.sleepQuality +
      Math.min(15, input.missedWorkouts * WEIGHTS.fatigue.missedWorkoutsPenalty) +
      Math.min(10, Math.max(0, input.currentStreak - 4) * WEIGHTS.fatigue.longStreakPenalty);

    return this.clampScore(fatigue);
  }

  private calculateRecoveryTrend(
    readinessScore: number,
    previousReadinessScores: number[],
  ): RecoveryTrend {
    if (previousReadinessScores.length === 0) {
      return 'stable';
    }

    const average =
      previousReadinessScores.reduce((total, value) => total + value, 0) /
      previousReadinessScores.length;
    const difference = readinessScore - average;

    if (difference >= 5) {
      return 'improving';
    }

    if (difference <= -5) {
      return 'declining';
    }

    return 'stable';
  }

  private mapRecommendedIntensity(
    readinessScore: number,
  ): RecommendedIntensity {
    if (readinessScore <= 39) {
      return 'recovery';
    }

    if (readinessScore <= 59) {
      return 'light';
    }

    if (readinessScore <= 79) {
      return 'moderate';
    }

    return 'hard';
  }

  private buildInfluences(input: {
    hasSleepQuality: boolean;
    hasEnergyLevel: boolean;
    hasMuscleSoreness: boolean;
    hasAdherenceScore: boolean;
    hasRecentWorkoutLoad: boolean;
    hasCurrentStreak: boolean;
    hasMissedWorkouts: boolean;
    sleepQuality: number;
    energyLevel: number;
    muscleSoreness: number;
    adherenceScore: number;
    recentWorkoutLoad: number;
    currentStreak: number;
    missedWorkouts: number;
  }): RecoveryInfluence[] {
    const influences: RecoveryInfluenceProps[] = [];

    if (input.hasSleepQuality && input.sleepQuality <= 2) {
      influences.push({
        code: 'LOW_SLEEP',
        label: 'Low sleep quality is reducing recovery readiness.',
        impact: 'negative',
        weight: 0.3,
        value: input.sleepQuality,
      });
    }

    if (input.hasEnergyLevel && input.energyLevel <= 2) {
      influences.push({
        code: 'LOW_ENERGY',
        label: 'Low energy is reducing readiness.',
        impact: 'negative',
        weight: 0.3,
        value: input.energyLevel,
      });
    }

    if (input.hasMuscleSoreness && input.muscleSoreness >= 4) {
      influences.push({
        code: 'HIGH_MUSCLE_SORENESS',
        label: 'Muscle soreness is elevated.',
        impact: 'negative',
        weight: 0.15,
        value: input.muscleSoreness,
      });
    }

    if (input.hasAdherenceScore && input.adherenceScore >= 80) {
      influences.push({
        code: 'HIGH_ADHERENCE',
        label: 'Recent adherence is strong.',
        impact: 'positive',
        weight: 0.15,
        value: input.adherenceScore,
      });
    }

    if (input.hasAdherenceScore && input.adherenceScore <= 50) {
      influences.push({
        code: 'LOW_ADHERENCE',
        label: 'Recent adherence is below the target range.',
        impact: 'negative',
        weight: 0.15,
        value: input.adherenceScore,
      });
    }

    if (input.hasRecentWorkoutLoad && input.recentWorkoutLoad >= 70) {
      influences.push({
        code: 'HIGH_WORKOUT_LOAD',
        label: 'Recent training load is high.',
        impact: 'negative',
        weight: 0.1,
        value: input.recentWorkoutLoad,
      });
    }

    if (input.hasRecentWorkoutLoad && input.recentWorkoutLoad > 0) {
      influences.push({
        code: 'RECENT_WORKOUT_COMPLETION',
        label: 'Recent workouts were completed.',
        impact: 'positive',
        weight: 0.1,
        value: input.recentWorkoutLoad,
      });
    }

    if (input.hasCurrentStreak && input.currentStreak >= 5) {
      influences.push({
        code: 'LONG_STREAK',
        label: 'The current streak is long enough to matter.',
        impact: 'positive',
        weight: 0.08,
        value: input.currentStreak,
      });
    }

    if (input.hasMissedWorkouts && input.missedWorkouts > 0) {
      influences.push({
        code: 'MISSED_WORKOUTS',
        label: 'Recent missed workouts are dragging readiness down.',
        impact: 'negative',
        weight: 0.2,
        value: input.missedWorkouts,
      });
    }

    return influences.map((influence) => new RecoveryInfluence(influence));
  }

  private invertScore(value: number): number {
    return this.clampScore(100 - value);
  }

  private resolveFiveScale(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return this.normalizeFiveScale(3);
    }

    return this.normalizeFiveScale(value);
  }

  private normalizeFiveScale(value: number): number {
    const clamped = Math.min(5, Math.max(1, value));

    return this.clampScore(((clamped - 1) / 4) * 100);
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return this.clampScore(fallback);
    }

    return this.clampScore(value);
  }

  private resolveNonNegativeInteger(value: number | undefined): number {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      return 0;
    }

    return Math.round(value);
  }

  private resolveScores(values?: number[]): number[] {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
      .map((value) => this.clampScore(value));
  }

  private clampScore(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }
}
