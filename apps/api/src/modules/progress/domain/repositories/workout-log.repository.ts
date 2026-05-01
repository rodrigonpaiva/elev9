import {
  WorkoutLog,
  WorkoutLogExercise,
  WorkoutLogFeedback,
} from "../entities/workout-log.entity";

export interface CreateWorkoutLogRepositoryInput {
  trainingPlanId: string;
  workoutDayIndex: number;
  durationMinutes: number;
  completedExercises: WorkoutLogExercise[];
  feedback?: WorkoutLogFeedback;
  date: string;
}

export interface WorkoutLogRepository {
  findByTrainingPlanDayAndDate(input: {
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
  }): Promise<WorkoutLog | null>;
  findByTrainingPlanIdsAndDateRange(input: {
    trainingPlanIds: string[];
    startDate: string;
    endDate: string;
  }): Promise<WorkoutLog[]>;
  create(input: CreateWorkoutLogRepositoryInput): Promise<WorkoutLog>;
}

export const WORKOUT_LOG_REPOSITORY = Symbol("WORKOUT_LOG_REPOSITORY");
