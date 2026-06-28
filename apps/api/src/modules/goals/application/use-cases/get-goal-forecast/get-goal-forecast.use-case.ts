import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domain/repositories/goal.repository';
import {
  GOAL_FORECAST_REPOSITORY,
  GoalForecastRepository,
} from '../../../domain/repositories/goal-forecast.repository';
import { GoalDateService } from '../../services/goal-date.service';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
  resolveActiveGoalOrSeed,
  resolveUserProfileOrThrow,
} from '../../services/goal-seed.utils';
import { BuildGoalForecastUseCase } from '../build-goal-forecast/build-goal-forecast.use-case';
import { BuildGoalForecastError } from '../build-goal-forecast/build-goal-forecast.errors';
import { GetGoalForecastInput } from './get-goal-forecast.input';
import { GetGoalForecastOutput } from './get-goal-forecast.output';

@Injectable()
export class GetGoalForecastUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(GOAL_FORECAST_REPOSITORY)
    private readonly goalForecastRepository: GoalForecastRepository,
    private readonly buildGoalForecastUseCase: BuildGoalForecastUseCase,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(input: GetGoalForecastInput): Promise<GetGoalForecastOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
      });

      const { goal } = await resolveActiveGoalOrSeed({
        userProfile,
        goalRepository: this.goalRepository,
        fitnessProfileRepository: this.fitnessProfileRepository,
        goalDateService: this.goalDateService,
      });

      const existingForecast = await this.goalForecastRepository.findByGoalId(
        goal.id,
      );

      if (existingForecast) {
        return {
          goalForecast: existingForecast,
        };
      }

      return await this.buildGoalForecastUseCase.execute({
        authUserId: input.authUserId,
      });
    } catch (error) {
      if (
        error instanceof GoalReadError ||
        error instanceof BuildGoalForecastError
      ) {
        throw error;
      }

      throw new GoalReadError(
        GOAL_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
