import {
  TrainingPlanExercise,
  TrainingPlanIntensity,
} from '../../../../training/domain/entities/training-plan.entity';
import {
  GoalContract,
  GoalForecastContract,
  GoalMilestoneContract,
  GoalProgressSnapshotContract,
} from '../../../../goals/domain/goals.contract';
import type { HabitReadModelPayload } from '../../../../../shared/mappers';

export class GetHomeDashboardResponseDto {
  dashboard!: {
    user: {
      name: string;
    };
    fitnessProfile: {
      id: string;
      goal: 'lose_weight' | 'gain_muscle' | 'maintain';
      activityLevel: 'low' | 'medium' | 'high';
    } | null;
    trainingPlan: {
      id: string;
      todayWorkout: {
        dayIndex: number;
        title: string;
        focus: string;
        format: string;
        intensity: TrainingPlanIntensity;
        exercises: TrainingPlanExercise[];
      } | null;
    } | null;
    goal?: {
      current: GoalContract;
      progressSnapshot?: GoalProgressSnapshotContract;
      forecast?: GoalForecastContract;
      milestones?: GoalMilestoneContract[];
    };
    habits?: HabitReadModelPayload;
    progressSummary: {
      period: 'week';
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
    recovery: {
      fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH';
      recommendedIntensity: 'low' | 'medium' | 'normal';
      recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
      readinessScore?: number;
      fatigueScore?: number;
      recoveryInfluences?: Array<{
        code:
          | 'LOW_SLEEP'
          | 'LOW_ENERGY'
          | 'HIGH_MUSCLE_SORENESS'
          | 'HIGH_ADHERENCE'
          | 'LOW_ADHERENCE'
          | 'HIGH_WORKOUT_LOAD'
          | 'RECENT_WORKOUT_COMPLETION'
          | 'LONG_STREAK'
          | 'MISSED_WORKOUTS';
        label: string;
        impact: 'positive' | 'negative' | 'neutral';
        weight?: number;
        value?: number;
      }>;
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
        createdAt: string;
      };
    };
    coachDecision?: {
      priority: 'recovery' | 'nutrition' | 'training' | 'consistency' | 'motivation';
      headline: string;
      summary: string;
      actionItems: string[];
      influences: Array<{
        code:
          | 'LOW_READINESS'
          | 'HIGH_FATIGUE'
          | 'LOW_NUTRITION_ADHERENCE'
          | 'HIGH_NUTRITION_ADHERENCE'
          | 'REST_DAY_RECOMMENDED'
          | 'RECOVERY_WORKOUT_RECOMMENDED'
          | 'INCREASE_INTENSITY_RECOMMENDED'
          | 'DECREASE_INTENSITY_RECOMMENDED'
          | 'LOW_TRAINING_ADHERENCE'
          | 'LONG_STREAK'
          | 'NO_RECENT_ACTIVITY'
          | 'GOOD_CONSISTENCY';
        label: string;
        impact: 'positive' | 'negative' | 'neutral';
        source: 'recovery' | 'nutrition' | 'training' | 'progress' | 'memory';
        weight?: number;
        value?: number;
      }>;
    };
    adaptiveTrainingRecommendation?: {
      recommendationType:
        | 'increase_intensity'
        | 'decrease_intensity'
        | 'increase_volume'
        | 'decrease_volume'
        | 'recovery_workout'
        | 'rest_day'
        | 'reschedule_workout'
        | 'maintain';
      recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
      volumeAction: 'increase' | 'maintain' | 'decrease';
      reasoning: string;
      influences: Array<{
        code:
          | 'HIGH_READINESS'
          | 'LOW_READINESS'
          | 'HIGH_FATIGUE'
          | 'LOW_FATIGUE'
          | 'RECOVERY_TREND_IMPROVING'
          | 'RECOVERY_TREND_DECLINING'
          | 'HIGH_ADHERENCE'
          | 'LOW_ADHERENCE'
          | 'LONG_STREAK'
          | 'MISSED_WORKOUTS'
          | 'GOOD_NUTRITION_SUPPORT'
          | 'POOR_NUTRITION_SUPPORT'
          | 'RECENT_WORKOUT_LOAD_HIGH'
          | 'RECENT_WORKOUT_LOAD_LOW';
        label: string;
        impact: 'positive' | 'negative' | 'neutral';
        weight?: number;
        value?: number;
      }>;
    };
    nutritionGuidance: {
      priority: 'recovery' | 'consistency' | 'performance';
      message: string;
      signals: string[];
    };
  };
}
