import { Inject, Injectable } from '@nestjs/common';

import { BuildHabitRiskSignalsError } from '../build-habit-risk-signals/build-habit-risk-signals.errors';
import { BuildHabitRiskSignalsUseCase } from '../build-habit-risk-signals/build-habit-risk-signals.use-case';
import {
  HABIT_RISK_SIGNAL_REPOSITORY,
  HabitRiskSignalRepository,
} from '../../../domain/repositories/habit-risk-signal.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_HABIT_RISK_SIGNALS_ERROR_CODES,
  GetHabitRiskSignalsError,
} from './get-habit-risk-signals.errors';
import type { GetHabitRiskSignalsInput } from './get-habit-risk-signals.input';
import type { GetHabitRiskSignalsOutput } from './get-habit-risk-signals.output';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
  resolveUserProfileOrThrow,
} from '../../services/habit-read.errors';

const RECENT_RISK_SIGNAL_LIMIT = 30;

@Injectable()
export class GetHabitRiskSignalsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(HABIT_RISK_SIGNAL_REPOSITORY)
    private readonly habitRiskSignalRepository: HabitRiskSignalRepository,
    private readonly buildHabitRiskSignalsUseCase: BuildHabitRiskSignalsUseCase,
  ) {}

  async execute(
    input: GetHabitRiskSignalsInput,
  ): Promise<GetHabitRiskSignalsOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
        errorFactory: (code, message, details) =>
          new GetHabitRiskSignalsError(code, message, details),
      });

      const recentSignals =
        await this.habitRiskSignalRepository.findRecentByUserProfileId(
          userProfile.id,
          {
            limit: RECENT_RISK_SIGNAL_LIMIT,
          },
        );

      if (recentSignals.length > 0) {
        return {
          habitRiskSignals: recentSignals,
        };
      }

      return await this.buildHabitRiskSignalsUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (error instanceof HabitReadError) {
        throw error;
      }

      if (error instanceof BuildHabitRiskSignalsError) {
        throw new GetHabitRiskSignalsError(
          GET_HABIT_RISK_SIGNALS_ERROR_CODES.INTERNAL_ERROR,
          'An unexpected error occurred.',
          {
            buildErrorCode: error.code,
            buildErrorMessage: error.message,
          },
        );
      }

      throw new GetHabitRiskSignalsError(
        HABIT_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
