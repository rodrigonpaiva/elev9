import {
  TrainingPlanExercise,
  TrainingPlanIntensity,
} from "../../../../training/domain/entities/training-plan.entity";

export class GetHomeDashboardResponseDto {
  dashboard!: {
    user: {
      name: string;
    };
    fitnessProfile: {
      id: string;
      goal: "lose_weight" | "gain_muscle" | "maintain";
      activityLevel: "low" | "medium" | "high";
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
    progressSummary: {
      period: "week";
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
  };
}
