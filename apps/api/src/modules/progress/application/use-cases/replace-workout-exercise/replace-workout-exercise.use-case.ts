import { Inject, Injectable } from '@nestjs/common';

import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  WORKOUT_SESSION_REPOSITORY,
  WorkoutSessionRepository,
} from '../../../domain/repositories/workout-session.repository';
import {
  WorkoutSessionExercise,
  WorkoutSessionReplacement,
} from '../../../domain/entities/workout-session.entity';
import {
  REPLACE_WORKOUT_EXERCISE_ERROR_CODES,
  ReplaceWorkoutExerciseError,
} from './replace-workout-exercise.errors';

export type ReplaceWorkoutExerciseInput = {
  authUserId: string;
  sessionId: string;
  exerciseIndex: number;
  currentExerciseName: string;
  replacementExercise: WorkoutSessionExercise;
  reason: WorkoutSessionReplacement['reason'];
  idempotencyKey: string;
};

@Injectable()
export class ReplaceWorkoutExerciseUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_SESSION_REPOSITORY)
    private readonly workoutSessionRepository: WorkoutSessionRepository,
  ) {}

  async execute(input: ReplaceWorkoutExerciseInput) {
    const authUserId = input.authUserId.trim();
    if (!authUserId || !/^[a-f\d]{24}$/i.test(input.sessionId)) {
      throw new ReplaceWorkoutExerciseError(
        REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INVALID_SESSION,
        'Invalid workout session.',
      );
    }
    if (
      !Number.isInteger(input.exerciseIndex) ||
      input.exerciseIndex < 0 ||
      input.exerciseIndex > 100 ||
      !input.currentExerciseName.trim() ||
      !input.idempotencyKey.trim() ||
      !this.isValidExercise(input.replacementExercise)
    ) {
      throw new ReplaceWorkoutExerciseError(
        REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INVALID_INPUT,
        'Invalid workout replacement input.',
      );
    }

    try {
      const profile =
        await this.userProfileRepository.findByAuthUserId(authUserId);
      const session = await this.workoutSessionRepository.findById(
        input.sessionId,
      );
      if (!profile || !session || session.userProfileId !== profile.id) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.SESSION_NOT_FOUND,
          'Workout session not found.',
        );
      }
      if (session.status === 'completed') {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.SESSION_COMPLETED,
          'Completed workout sessions cannot be changed.',
        );
      }

      const plan = await this.trainingPlanRepository.findById(
        session.trainingPlanId,
      );
      const day = plan?.weeklySchedule.find(
        (item) => item.dayIndex === session.workoutDayIndex,
      );
      const originalExercise = day?.exercises[input.exerciseIndex];
      if (!originalExercise) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.EXERCISE_NOT_FOUND,
          'Exercise is not available in this workout.',
        );
      }
      const prior = session.replacements.find(
        (item) => item.exerciseIndex === input.exerciseIndex,
      );
      if (prior && prior.idempotencyKey === input.idempotencyKey) {
        return { workoutSession: session };
      }
      const currentExercise = prior?.replacementExercise ?? originalExercise;
      if (currentExercise.name !== input.currentExerciseName) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.CONFLICT,
          'The workout changed. Reload it before replacing this exercise.',
        );
      }
      if (prior) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.CONFLICT,
          'This exercise has already been replaced in this session.',
        );
      }
      if (
        !this.isAllowedAlternative(
          currentExercise,
          day.focus,
          day.format,
          input.replacementExercise,
        )
      ) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INVALID_ALTERNATIVE,
          'This alternative is not compatible with the workout.',
        );
      }

      const replacement: WorkoutSessionReplacement = {
        exerciseIndex: input.exerciseIndex,
        originalExercise,
        replacementExercise: input.replacementExercise,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey.trim(),
        replacedAt: new Date(),
      };
      const updated = await this.workoutSessionRepository.replaceExercise({
        sessionId: session.id,
        replacement,
      });
      if (!updated) {
        throw new ReplaceWorkoutExerciseError(
          REPLACE_WORKOUT_EXERCISE_ERROR_CODES.CONFLICT,
          'This exercise was changed by another request. Reload the workout.',
        );
      }
      return { workoutSession: updated };
    } catch (error) {
      if (error instanceof ReplaceWorkoutExerciseError) throw error;
      throw new ReplaceWorkoutExerciseError(
        REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred while replacing the exercise.',
      );
    }
  }

  private isValidExercise(exercise: WorkoutSessionExercise) {
    return Boolean(
      exercise &&
      typeof exercise.name === 'string' &&
      exercise.name.trim().length > 0 &&
      exercise.name.length <= 120 &&
      Number.isInteger(exercise.sets) &&
      exercise.sets > 0 &&
      exercise.sets <= 100 &&
      typeof exercise.reps === 'string' &&
      exercise.reps.length > 0 &&
      exercise.reps.length <= 40 &&
      Number.isInteger(exercise.restSeconds) &&
      exercise.restSeconds >= 0 &&
      exercise.restSeconds <= 3600,
    );
  }

  private isAllowedAlternative(
    exercise: WorkoutSessionExercise,
    focus: string,
    format: string,
    replacement: WorkoutSessionExercise,
  ) {
    const descriptor = `${exercise.name} ${focus} ${format}`.toLowerCase();
    const names =
      descriptor.includes('pull') || descriptor.includes('row')
        ? ['Lat Pulldown', 'Assisted Pull Up', 'Resistance Band Pull Down']
        : descriptor.includes('burpee')
          ? ['Mountain Climbers', 'Squat Thrust', 'Step Back Burpee']
          : descriptor.includes('squat')
            ? ['Goblet Squat', 'Box Squat', 'Split Squat']
            : descriptor.includes('press') || descriptor.includes('bench')
              ? ['Push Up', 'Dumbbell Press', 'Machine Chest Press']
              : descriptor.includes('deadlift') || descriptor.includes('hinge')
                ? ['Romanian Deadlift', 'Hip Thrust', 'Glute Bridge']
                : [
                    'Modified Variation',
                    'Dumbbell Variation',
                    'Machine Variation',
                  ];
    return (
      names.includes(replacement.name) &&
      replacement.sets === exercise.sets &&
      replacement.reps === exercise.reps &&
      replacement.restSeconds === exercise.restSeconds
    );
  }
}
