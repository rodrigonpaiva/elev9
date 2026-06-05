import {
  ActivityLevel,
  FitnessGoal,
} from '../../../../fitness/domain/entities/fitness-profile.entity';
import {
  GoalDashboardPayload,
  NotificationReadModelPayload,
} from '../../../../../shared/mappers';
import {
  CoachDecisionInfluenceProps,
} from '../../../../ai/domain/value-objects/coach-decision-influence.value-object';
import {
  CoachDecisionPriority,
} from '../../../../ai/domain/value-objects/coach-decision-priority.value-object';
import {
  TrainingPlanDay,
  TrainingPlanExercise,
  TrainingPlanIntensity,
} from '../../../../training/domain/entities/training-plan.entity';
import { FatigueLevel } from '../../../../ai/application/services/context-builder/build-user-health-context.service';

type DashboardWorkoutExercise = TrainingPlanExercise;

type DashboardTodayWorkout = {
  dayIndex: number;
  title: string;
  focus: string;
  format: string;
  intensity: TrainingPlanIntensity;
  exercises: DashboardWorkoutExercise[];
};

type DashboardNutritionGuidance = {
  priority: 'recovery' | 'consistency' | 'performance';
  message: string;
  signals: string[];
};

type DashboardAdaptiveTrainingRecommendation = {
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

type DashboardCoachDecision = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceProps[];
};

type DashboardRecoveryInfluence = {
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
};

export type GetHomeDashboardOutput = {
  dashboard: {
    user: {
      name: string;
    };
    fitnessProfile: {
      id: string;
      goal: FitnessGoal;
      activityLevel: ActivityLevel;
    } | null;
    trainingPlan: {
      id: string;
      todayWorkout: DashboardTodayWorkout | null;
    } | null;
    goal?: GoalDashboardPayload;
    notification?: NotificationReadModelPayload;
    progressSummary: {
      period: 'week';
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
    recovery: {
      fatigueLevel: FatigueLevel;
      recommendedIntensity: 'low' | 'medium' | 'normal';
      recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
      readinessScore?: number;
      fatigueScore?: number;
      recoveryInfluences?: DashboardRecoveryInfluence[];
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
        createdAt: string;
      };
    };
    coachDecision?: DashboardCoachDecision;
    adaptiveTrainingRecommendation?: DashboardAdaptiveTrainingRecommendation;
    nutritionGuidance: DashboardNutritionGuidance;
  };
};
