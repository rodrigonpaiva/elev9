import { Injectable } from '@nestjs/common';

import {
  RecoveryTrend,
  RecommendedIntensity as RecoveryRecommendedIntensity,
} from '../../../recovery/domain/entities/recovery-snapshot.entity';
import {
  AdaptiveTrainingInfluence,
  AdaptiveTrainingInfluenceProps,
} from '../../domain/value-objects/adaptive-training-influence.value-object';
import {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveVolumeAction,
} from '../../domain/value-objects/adaptive-recommendation-type.value-object';

export const ADAPTIVE_TRAINING_RECOMMENDATION_CALCULATOR_VERSION =
  'adaptive-training-deterministic-v1';

export type AdaptiveTrainingRecommendationCalculatorInput = {
  readinessScore?: number;
  fatigueScore?: number;
  recoveryTrend?: RecoveryTrend;
  recoveryRecommendedIntensity?: RecoveryRecommendedIntensity;
  adherenceScore?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  recentWorkoutLoad?: number;
  nutritionAdherence?: number;
};

export type AdaptiveTrainingRecommendationCalculatorOutput = {
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluence[];
};

const INTENSITY_ORDER: AdaptiveRecommendedIntensity[] = [
  'recovery',
  'light',
  'moderate',
  'hard',
];

@Injectable()
export class AdaptiveTrainingRecommendationCalculatorService {
  calculate(
    input: AdaptiveTrainingRecommendationCalculatorInput,
  ): AdaptiveTrainingRecommendationCalculatorOutput {
    const readiness = this.resolveScore(input.readinessScore, 50);
    const fatigue = this.resolveScore(input.fatigueScore, 50);
    const adherence = this.resolveScore(input.adherenceScore, 50);
    const streak = this.resolveNonNegativeInteger(input.currentStreak);
    const missedWorkouts = this.resolveNonNegativeInteger(input.missedWorkouts);
    const recentWorkoutLoad = this.resolveScore(input.recentWorkoutLoad, 50);
    const nutritionAdherence = this.resolveScore(input.nutritionAdherence, 50);

    const influences = this.buildInfluences({
      readiness,
      fatigue,
      recoveryTrend: input.recoveryTrend ?? 'stable',
      adherence,
      streak,
      missedWorkouts,
      recentWorkoutLoad,
      nutritionAdherence,
      hasReadiness: typeof input.readinessScore === 'number',
      hasFatigue: typeof input.fatigueScore === 'number',
      hasAdherence: typeof input.adherenceScore === 'number',
      hasStreak: typeof input.currentStreak === 'number',
      hasMissedWorkouts: typeof input.missedWorkouts === 'number',
      hasRecentWorkoutLoad: typeof input.recentWorkoutLoad === 'number',
      hasNutritionAdherence: typeof input.nutritionAdherence === 'number',
    });

    const baseIntensity = input.recoveryRecommendedIntensity
      ? input.recoveryRecommendedIntensity
      : this.calculateFallbackIntensity({ readiness, fatigue });
    const recommendationType = this.selectRecommendationType({
      readiness,
      fatigue,
      adherence,
      streak,
      missedWorkouts,
      recentWorkoutLoad,
      nutritionAdherence,
      recoveryTrend: input.recoveryTrend ?? 'stable',
    });
    const volumeAction = this.selectVolumeAction({
      recommendationType,
      readiness,
      fatigue,
      adherence,
      streak,
      missedWorkouts,
      recentWorkoutLoad,
      nutritionAdherence,
      recoveryTrend: input.recoveryTrend ?? 'stable',
    });
    const recommendedIntensity = this.resolveRecommendedIntensity({
      baseIntensity,
      recommendationType,
      readiness,
      fatigue,
      recentWorkoutLoad,
    });

    return {
      recommendationType,
      recommendedIntensity,
      volumeAction,
      reasoning: this.buildReasoning({
        recommendationType,
        recommendedIntensity,
        volumeAction,
        readiness,
        fatigue,
        adherence,
        streak,
        missedWorkouts,
        recentWorkoutLoad,
        nutritionAdherence,
        recoveryTrend: input.recoveryTrend ?? 'stable',
        recoveryRecommendedIntensity: input.recoveryRecommendedIntensity,
      }),
      influences,
    };
  }

  private selectRecommendationType(input: {
    readiness: number;
    fatigue: number;
    adherence: number;
    streak: number;
    missedWorkouts: number;
    recentWorkoutLoad: number;
    nutritionAdherence: number;
    recoveryTrend: RecoveryTrend;
  }): AdaptiveRecommendationType {
    if (input.readiness < 30 && input.fatigue > 85) {
      return 'rest_day';
    }

    if (input.readiness < 40 || input.fatigue > 75) {
      return 'recovery_workout';
    }

    if (
      input.adherence <= 50 &&
      input.fatigue <= 60 &&
      (input.missedWorkouts > 0 || input.streak < 2)
    ) {
      return 'reschedule_workout';
    }

    if (input.readiness < 60 || input.fatigue > 60) {
      if (
        input.recentWorkoutLoad >= 70 ||
        input.recoveryTrend === 'declining' ||
        input.nutritionAdherence < 45
      ) {
        return 'decrease_volume';
      }

      return 'decrease_intensity';
    }

    if (input.readiness >= 80 && input.fatigue <= 30) {
      if (input.adherence >= 80 && input.nutritionAdherence >= 70) {
        return 'increase_volume';
      }

      return 'increase_intensity';
    }

    if (input.readiness >= 60 && input.fatigue <= 50) {
      return 'maintain';
    }

    return 'maintain';
  }

  private selectVolumeAction(input: {
    recommendationType: AdaptiveRecommendationType;
    readiness: number;
    fatigue: number;
    adherence: number;
    streak: number;
    missedWorkouts: number;
    recentWorkoutLoad: number;
    nutritionAdherence: number;
    recoveryTrend: RecoveryTrend;
  }): AdaptiveVolumeAction {
    switch (input.recommendationType) {
      case 'increase_intensity':
      case 'increase_volume':
        return input.readiness >= 80 &&
          input.fatigue <= 30 &&
          input.adherence >= 70 &&
          input.nutritionAdherence >= 70
          ? 'increase'
          : 'maintain';
      case 'decrease_intensity':
      case 'decrease_volume':
      case 'recovery_workout':
      case 'rest_day':
      case 'reschedule_workout':
        return 'decrease';
      case 'maintain':
      default:
        if (
          input.readiness >= 80 &&
          input.fatigue <= 30 &&
          input.adherence >= 75 &&
          input.nutritionAdherence >= 70 &&
          input.recentWorkoutLoad <= 60
        ) {
          return 'increase';
        }

        if (
          input.readiness < 60 ||
          input.fatigue > 60 ||
          input.recoveryTrend === 'declining' ||
          input.recentWorkoutLoad >= 70 ||
          input.missedWorkouts > 0
        ) {
          return 'decrease';
        }

        return 'maintain';
    }
  }

  private calculateFallbackIntensity(input: {
    readiness: number;
    fatigue: number;
  }): AdaptiveRecommendedIntensity {
    if (input.readiness < 30 && input.fatigue > 85) {
      return 'recovery';
    }

    if (input.readiness < 40 || input.fatigue > 75) {
      return 'recovery';
    }

    if (input.readiness < 60 || input.fatigue > 60) {
      return 'light';
    }

    if (input.readiness >= 80 && input.fatigue <= 30) {
      return 'hard';
    }

    if (input.readiness >= 60 && input.fatigue <= 50) {
      return 'moderate';
    }

    return 'moderate';
  }

  private resolveRecommendedIntensity(input: {
    baseIntensity: AdaptiveRecommendedIntensity;
    recommendationType: AdaptiveRecommendationType;
    readiness: number;
    fatigue: number;
    recentWorkoutLoad: number;
  }): AdaptiveRecommendedIntensity {
    if (
      input.recommendationType === 'rest_day' ||
      input.recommendationType === 'recovery_workout'
    ) {
      return 'recovery';
    }

    if (input.recommendationType === 'reschedule_workout') {
      return 'light';
    }

    if (input.recommendationType === 'decrease_intensity') {
      return this.stepIntensity(input.baseIntensity, -1);
    }

    if (input.recommendationType === 'decrease_volume') {
      if (input.fatigue > 75 || input.recentWorkoutLoad >= 70) {
        return this.stepIntensity(input.baseIntensity, -1);
      }

      return input.baseIntensity;
    }

    if (input.recommendationType === 'increase_intensity') {
      return this.stepIntensity(input.baseIntensity, 1);
    }

    if (input.recommendationType === 'increase_volume') {
      if (input.baseIntensity === 'recovery') {
        return 'light';
      }

      if (input.baseIntensity === 'light') {
        return 'moderate';
      }

      return input.baseIntensity;
    }

    return input.baseIntensity;
  }

  private stepIntensity(
    value: AdaptiveRecommendedIntensity,
    delta: -1 | 1,
  ): AdaptiveRecommendedIntensity {
    const index = INTENSITY_ORDER.indexOf(value);
    const nextIndex = Math.min(
      INTENSITY_ORDER.length - 1,
      Math.max(0, index + delta),
    );

    return INTENSITY_ORDER[nextIndex];
  }

  private buildInfluences(input: {
    readiness: number;
    fatigue: number;
    recoveryTrend: RecoveryTrend;
    adherence: number;
    streak: number;
    missedWorkouts: number;
    recentWorkoutLoad: number;
    nutritionAdherence: number;
    hasReadiness: boolean;
    hasFatigue: boolean;
    hasAdherence: boolean;
    hasStreak: boolean;
    hasMissedWorkouts: boolean;
    hasRecentWorkoutLoad: boolean;
    hasNutritionAdherence: boolean;
  }): AdaptiveTrainingInfluence[] {
    const influences: AdaptiveTrainingInfluenceProps[] = [];

    if (input.hasReadiness && input.readiness >= 80) {
      influences.push({
        code: 'HIGH_READINESS',
        label: 'Readiness is high enough to support progression.',
        impact: 'positive',
        weight: 0.25,
        value: input.readiness,
      });
    } else if (input.hasReadiness && input.readiness <= 45) {
      influences.push({
        code: 'LOW_READINESS',
        label: 'Readiness is below the ideal range for hard work.',
        impact: 'negative',
        weight: 0.25,
        value: input.readiness,
      });
    }

    if (input.hasFatigue && input.fatigue >= 70) {
      influences.push({
        code: 'HIGH_FATIGUE',
        label: 'Fatigue is elevated.',
        impact: 'negative',
        weight: 0.3,
        value: input.fatigue,
      });
    } else if (input.hasFatigue && input.fatigue <= 35) {
      influences.push({
        code: 'LOW_FATIGUE',
        label: 'Fatigue is low enough to support work.',
        impact: 'positive',
        weight: 0.18,
        value: input.fatigue,
      });
    }

    if (input.recoveryTrend === 'improving') {
      influences.push({
        code: 'RECOVERY_TREND_IMPROVING',
        label: 'Recovery is trending up.',
        impact: 'positive',
        weight: 0.16,
      });
    } else if (input.recoveryTrend === 'declining') {
      influences.push({
        code: 'RECOVERY_TREND_DECLINING',
        label: 'Recovery is trending down.',
        impact: 'negative',
        weight: 0.16,
      });
    }

    if (input.hasAdherence && input.adherence >= 80) {
      influences.push({
        code: 'HIGH_ADHERENCE',
        label: 'Adherence has been strong.',
        impact: 'positive',
        weight: 0.15,
        value: input.adherence,
      });
    } else if (input.hasAdherence && input.adherence <= 50) {
      influences.push({
        code: 'LOW_ADHERENCE',
        label: 'Adherence is below target.',
        impact: 'negative',
        weight: 0.15,
        value: input.adherence,
      });
    }

    if (input.hasStreak && input.streak >= 5) {
      influences.push({
        code: 'LONG_STREAK',
        label: 'The current streak supports consistency.',
        impact: 'positive',
        weight: 0.1,
        value: input.streak,
      });
    }

    if (input.hasMissedWorkouts && input.missedWorkouts > 0) {
      influences.push({
        code: 'MISSED_WORKOUTS',
        label: 'Recent missed workouts require caution.',
        impact: 'negative',
        weight: 0.2,
        value: input.missedWorkouts,
      });
    }

    if (input.hasNutritionAdherence && input.nutritionAdherence >= 70) {
      influences.push({
        code: 'GOOD_NUTRITION_SUPPORT',
        label: 'Nutrition support is sufficient for progression.',
        impact: 'positive',
        weight: 0.12,
        value: input.nutritionAdherence,
      });
    } else if (input.hasNutritionAdherence && input.nutritionAdherence <= 45) {
      influences.push({
        code: 'POOR_NUTRITION_SUPPORT',
        label: 'Nutrition support is lagging.',
        impact: 'negative',
        weight: 0.12,
        value: input.nutritionAdherence,
      });
    }

    if (input.hasRecentWorkoutLoad && input.recentWorkoutLoad >= 70) {
      influences.push({
        code: 'RECENT_WORKOUT_LOAD_HIGH',
        label: 'Recent workload is high.',
        impact: 'negative',
        weight: 0.14,
        value: input.recentWorkoutLoad,
      });
    } else if (
      input.hasRecentWorkoutLoad &&
      input.recentWorkoutLoad > 0 &&
      input.recentWorkoutLoad <= 30
    ) {
      influences.push({
        code: 'RECENT_WORKOUT_LOAD_LOW',
        label: 'Recent workload is low enough to absorb more work.',
        impact: 'positive',
        weight: 0.08,
        value: input.recentWorkoutLoad,
      });
    }

    return influences.map((influence) => new AdaptiveTrainingInfluence(influence));
  }

  private buildReasoning(input: {
    recommendationType: AdaptiveRecommendationType;
    recommendedIntensity: AdaptiveRecommendedIntensity;
    volumeAction: AdaptiveVolumeAction;
    readiness: number;
    fatigue: number;
    adherence: number;
    streak: number;
    missedWorkouts: number;
    recentWorkoutLoad: number;
    nutritionAdherence: number;
    recoveryTrend: RecoveryTrend;
    recoveryRecommendedIntensity?: RecoveryRecommendedIntensity;
  }): string {
    const parts = [
      `type=${input.recommendationType}`,
      `intensity=${input.recommendedIntensity}`,
      `volume=${input.volumeAction}`,
      `readiness=${input.readiness}`,
      `fatigue=${input.fatigue}`,
    ];

    if (input.recoveryRecommendedIntensity) {
      parts.push(`recovery_intensity=${input.recoveryRecommendedIntensity}`);
    }

    if (input.recoveryTrend !== 'stable') {
      parts.push(`trend=${input.recoveryTrend}`);
    }

    if (input.adherence !== 50) {
      parts.push(`adherence=${input.adherence}`);
    }

    if (input.streak > 0) {
      parts.push(`streak=${input.streak}`);
    }

    if (input.missedWorkouts > 0) {
      parts.push(`missed=${input.missedWorkouts}`);
    }

    if (input.recentWorkoutLoad !== 50) {
      parts.push(`load=${input.recentWorkoutLoad}`);
    }

    if (input.nutritionAdherence !== 50) {
      parts.push(`nutrition=${input.nutritionAdherence}`);
    }

    return parts.join('; ');
  }

  private resolveScore(value: number | undefined, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
  }

  private resolveNonNegativeInteger(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 0;
    }

    return Math.max(0, Math.round(value));
  }
}
