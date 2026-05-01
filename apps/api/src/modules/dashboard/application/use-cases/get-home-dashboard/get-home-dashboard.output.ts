import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import {
  TrainingPlanDay,
  TrainingPlanExercise,
  TrainingPlanIntensity,
} from "../../../../training/domain/entities/training-plan.entity";

type DashboardWorkoutExercise = TrainingPlanExercise;

type DashboardTodayWorkout = {
  dayIndex: number;
  title: string;
  focus: string;
  format: string;
  intensity: TrainingPlanIntensity;
  exercises: DashboardWorkoutExercise[];
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
  };
};
