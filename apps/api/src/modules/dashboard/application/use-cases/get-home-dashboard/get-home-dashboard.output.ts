import {
  ActivityLevel,
  FitnessGoal,
} from '../../../../fitness/domain/entities/fitness-profile.entity';
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
    nutritionGuidance: DashboardNutritionGuidance;
  };
};
