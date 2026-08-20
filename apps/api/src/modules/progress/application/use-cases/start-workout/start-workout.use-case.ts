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
import { CLOCK, Clock } from '../../../domain/services/clock.service';
import {
  WORKOUT_SESSION_REPOSITORY,
  WorkoutSessionRepository,
} from '../../../domain/repositories/workout-session.repository';
import {
  START_WORKOUT_ERROR_CODES,
  StartWorkoutError,
} from './start-workout.errors';
import { StartWorkoutInput } from './start-workout.input';
import { StartWorkoutOutput } from './start-workout.output';

@Injectable()
export class StartWorkoutUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_SESSION_REPOSITORY)
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  async execute(input: StartWorkoutInput): Promise<StartWorkoutOutput> {
    const authUserId = this.stringValue(input.authUserId);
    const trainingPlanId = this.stringValue(input.trainingPlanId);
    const date = this.clock.todayUtcDateString();

    if (!authUserId) {
      throw new StartWorkoutError(
        START_WORKOUT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!trainingPlanId || !Number.isInteger(input.workoutDayIndex)) {
      throw new StartWorkoutError(
        START_WORKOUT_ERROR_CODES.INVALID_INPUT,
        'Invalid workout start input.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);
      if (!userProfile) {
        throw new StartWorkoutError(
          START_WORKOUT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );
      if (!fitnessProfile) {
        throw new StartWorkoutError(
          START_WORKOUT_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const trainingPlan =
        await this.trainingPlanRepository.findById(trainingPlanId);
      if (
        !trainingPlan ||
        trainingPlan.fitnessProfileId !== fitnessProfile.id
      ) {
        throw new StartWorkoutError(
          START_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
          'Training plan not found.',
        );
      }

      if (
        !trainingPlan.weeklySchedule.some(
          (day) => day.dayIndex === input.workoutDayIndex,
        )
      ) {
        throw new StartWorkoutError(
          START_WORKOUT_ERROR_CODES.WORKOUT_NOT_AVAILABLE,
          'Workout is not available.',
        );
      }

      const existing = await this.workoutSessionRepository.findByPlanDayAndDate(
        {
          trainingPlanId,
          workoutDayIndex: input.workoutDayIndex,
          date,
        },
      );
      if (existing) {
        return { workoutSession: existing };
      }

      return {
        workoutSession: await this.workoutSessionRepository.create({
          userProfileId: userProfile.id,
          trainingPlanId,
          workoutDayIndex: input.workoutDayIndex,
          date,
          status: 'active',
        }),
      };
    } catch (error) {
      if (error instanceof StartWorkoutError) {
        throw error;
      }

      throw new StartWorkoutError(
        START_WORKOUT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }
}
