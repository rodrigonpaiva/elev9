import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import {
  TrainingPlanDay,
  TrainingPlanExercise,
  TrainingPlanIntensity,
} from "../../../../training/domain/entities/training-plan.entity";
import { FatigueLevel } from "../../../../ai/application/services/context-builder/build-user-health-context.service";

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
  priority: "recovery" | "consistency" | "performance";
  message: string;
  signals: string[];
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
      period: "week";
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
    recovery: {
      fatigueLevel: FatigueLevel;
      recommendedIntensity: "low" | "medium" | "normal";
      recoveryTrend: "improving" | "stable" | "needs_recovery";
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
