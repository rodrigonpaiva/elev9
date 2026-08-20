import { Inject, Injectable } from '@nestjs/common';

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
  COMPLETE_WORKOUT_ERROR_CODES,
  CompleteWorkoutError,
} from './complete-workout.errors';

@Injectable()
export class CompleteWorkoutUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(WORKOUT_SESSION_REPOSITORY)
    private readonly workoutSessionRepository: WorkoutSessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async get(input: { authUserId: string; sessionId: string }) {
    const session = await this.findOwnedSession(input);
    return { workoutSession: session };
  }

  async execute(input: { authUserId: string; sessionId: string }) {
    const session = await this.findOwnedSession(input);
    if (session.status === 'completed') return { workoutSession: session };

    if (session.date !== this.clock.todayUtcDateString()) {
      throw new CompleteWorkoutError(
        COMPLETE_WORKOUT_ERROR_CODES.SESSION_EXPIRED,
        'Workout session has expired.',
      );
    }

    const completed = await this.workoutSessionRepository.complete(
      session.id,
      this.clock.now(),
    );
    if (!completed) {
      throw new CompleteWorkoutError(
        COMPLETE_WORKOUT_ERROR_CODES.SESSION_NOT_FOUND,
        'Workout session not found.',
      );
    }
    return { workoutSession: completed };
  }

  private async findOwnedSession(input: {
    authUserId: string;
    sessionId: string;
  }) {
    const authUserId = input.authUserId.trim();
    const sessionId = input.sessionId.trim();
    if (!authUserId) {
      throw new CompleteWorkoutError(
        COMPLETE_WORKOUT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }
    if (!sessionId || !/^[a-f\d]{24}$/i.test(sessionId)) {
      throw new CompleteWorkoutError(
        COMPLETE_WORKOUT_ERROR_CODES.INVALID_INPUT,
        'Invalid workout session input.',
      );
    }

    try {
      const profile =
        await this.userProfileRepository.findByAuthUserId(authUserId);
      const session = await this.workoutSessionRepository.findById(sessionId);
      if (!profile || !session || session.userProfileId !== profile.id) {
        throw new CompleteWorkoutError(
          COMPLETE_WORKOUT_ERROR_CODES.SESSION_NOT_FOUND,
          'Workout session not found.',
        );
      }
      return session;
    } catch (error) {
      if (error instanceof CompleteWorkoutError) throw error;
      throw new CompleteWorkoutError(
        COMPLETE_WORKOUT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
