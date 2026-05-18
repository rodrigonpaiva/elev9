import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../domain/repositories/workout-log.repository';
import { CLOCK, Clock } from '../../../domain/services/clock.service';
import { LOG_WORKOUT_ERROR_CODES, LogWorkoutError } from './log-workout.errors';
import { LogWorkoutInput } from './log-workout.input';
import { LogWorkoutOutput } from './log-workout.output';

const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard'] as const);

@Injectable()
export class LogWorkoutUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(input: LogWorkoutInput): Promise<LogWorkoutOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const trainingPlanId =
      typeof input.trainingPlanId === 'string'
        ? input.trainingPlanId.trim()
        : '';
    const date = this.clock.todayUtcDateString();

    if (!authUserId) {
      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    this.validateStructuralInput({
      trainingPlanId,
      workoutDayIndex: input.workoutDayIndex,
      durationMinutes: input.durationMinutes,
      completedExercises: input.completedExercises,
      feedback: input.feedback,
    });

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const trainingPlan =
        await this.trainingPlanRepository.findById(trainingPlanId);

      if (
        !trainingPlan ||
        trainingPlan.fitnessProfileId !== fitnessProfile.id
      ) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
          'Training plan not found.',
        );
      }

      const hasWorkoutDay = trainingPlan.weeklySchedule.some(
        (day) => day.dayIndex === input.workoutDayIndex,
      );

      if (!hasWorkoutDay) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
          'Invalid workout log input.',
        );
      }

      const existingWorkoutLog =
        await this.workoutLogRepository.findByTrainingPlanDayAndDate({
          trainingPlanId,
          workoutDayIndex: input.workoutDayIndex,
          date,
        });

      if (existingWorkoutLog) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.ALREADY_EXISTS,
          'Workout log already exists.',
        );
      }

      const workoutLog = await this.workoutLogRepository.create({
        trainingPlanId,
        workoutDayIndex: input.workoutDayIndex,
        durationMinutes: input.durationMinutes,
        completedExercises: input.completedExercises.map((exercise) => ({
          name: exercise.name.trim(),
          setsDone: exercise.setsDone,
          repsDone: exercise.repsDone,
        })),
        feedback: input.feedback
          ? {
              difficulty: input.feedback.difficulty,
              notes: input.feedback.notes?.trim() || undefined,
            }
          : undefined,
        date,
      });

      return {
        workoutLog: {
          id: workoutLog.id,
          trainingPlanId: workoutLog.trainingPlanId,
          workoutDayIndex: workoutLog.workoutDayIndex,
          durationMinutes: workoutLog.durationMinutes,
          completedExercises: workoutLog.completedExercises,
          feedback: workoutLog.feedback,
          date: workoutLog.date,
          createdAt: workoutLog.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof LogWorkoutError) {
        throw error;
      }

      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private validateStructuralInput(input: {
    trainingPlanId: string;
    workoutDayIndex: number;
    durationMinutes: number;
    completedExercises: Array<{
      name: string;
      setsDone: number;
      repsDone: number;
    }>;
    feedback?: {
      difficulty: 'easy' | 'medium' | 'hard';
      notes?: string;
    };
  }): void {
    if (!input.trainingPlanId || !this.isValidObjectId(input.trainingPlanId)) {
      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
        'Training plan not found.',
      );
    }

    if (!Number.isInteger(input.workoutDayIndex)) {
      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
        'Invalid workout log input.',
      );
    }

    if (
      !Number.isInteger(input.durationMinutes) ||
      input.durationMinutes < 1 ||
      input.durationMinutes > 300
    ) {
      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
        'Invalid workout log input.',
      );
    }

    if (
      !Array.isArray(input.completedExercises) ||
      input.completedExercises.length === 0
    ) {
      throw new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
        'Invalid workout log input.',
      );
    }

    for (const exercise of input.completedExercises) {
      if (
        !exercise ||
        typeof exercise.name !== 'string' ||
        !exercise.name.trim() ||
        !Number.isInteger(exercise.setsDone) ||
        exercise.setsDone < 0 ||
        !Number.isInteger(exercise.repsDone) ||
        exercise.repsDone < 0
      ) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
          'Invalid workout log input.',
        );
      }
    }

    if (input.feedback) {
      if (!ALLOWED_DIFFICULTIES.has(input.feedback.difficulty)) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
          'Invalid workout log input.',
        );
      }

      if (
        input.feedback.notes !== undefined &&
        (typeof input.feedback.notes !== 'string' ||
          input.feedback.notes.length > 500)
      ) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
          'Invalid workout log input.',
        );
      }
    }
  }

  private isValidObjectId(value: string): boolean {
    return MONGO_OBJECT_ID_REGEX.test(value);
  }
}
