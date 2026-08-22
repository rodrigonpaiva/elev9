import {
  WorkoutSession,
  WorkoutSessionReplacement,
} from '../entities/workout-session.entity';

export interface CreateWorkoutSessionRepositoryInput {
  userProfileId: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  date: string;
  status: 'active';
}

export interface WorkoutSessionRepository {
  findById(id: string): Promise<WorkoutSession | null>;
  findByPlanDayAndDate(input: {
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
  }): Promise<WorkoutSession | null>;
  create(input: CreateWorkoutSessionRepositoryInput): Promise<WorkoutSession>;
  complete(id: string, completedAt: Date): Promise<WorkoutSession | null>;
  replaceExercise(input: {
    sessionId: string;
    replacement: WorkoutSessionReplacement;
  }): Promise<WorkoutSession | null>;
}

export const WORKOUT_SESSION_REPOSITORY = Symbol('WORKOUT_SESSION_REPOSITORY');
