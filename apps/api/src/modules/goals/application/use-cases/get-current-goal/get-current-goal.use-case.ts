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
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../domain/repositories/goal-progress-snapshot.repository';
import {
  GOAL_FORECAST_REPOSITORY,
  GoalForecastRepository,
} from '../../../domain/repositories/goal-forecast.repository';
import { BuildGoalProgressSnapshotUseCase } from '../build-goal-progress-snapshot/build-goal-progress-snapshot.use-case';
import { BuildGoalForecastUseCase } from '../build-goal-forecast/build-goal-forecast.use-case';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
  resolveActiveGoalOrSeed,
  resolveUserProfileOrThrow,
} from '../../services/goal-seed.utils';
import { GoalDateService } from '../../services/goal-date.service';
import { GetCurrentGoalInput } from './get-current-goal.input';
import { GetCurrentGoalOutput } from './get-current-goal.output';
import { BuildGoalForecastError } from '../build-goal-forecast/build-goal-forecast.errors';
import { BuildGoalProgressSnapshotError } from '../build-goal-progress-snapshot/build-goal-progress-snapshot.errors';

@Injectable()
export class GetCurrentGoalUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(GOAL_FORECAST_REPOSITORY)
    private readonly goalForecastRepository: GoalForecastRepository,
    private readonly buildGoalProgressSnapshotUseCase: BuildGoalProgressSnapshotUseCase,
    private readonly buildGoalForecastUseCase: BuildGoalForecastUseCase,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(input: GetCurrentGoalInput): Promise<GetCurrentGoalOutput> {
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

      const todayDate = this.goalDateService.todayUtcDateString();
      let progressSnapshot =
        await this.goalProgressSnapshotRepository.findByGoalIdAndDate(
          goal.id,
          todayDate,
        );

      if (!progressSnapshot) {
        progressSnapshot = (
          await this.buildGoalProgressSnapshotUseCase.execute({
            authUserId: input.authUserId,
          })
        ).goalProgressSnapshot;
      }

      let forecast = await this.goalForecastRepository.findByGoalId(goal.id);

      if (!forecast) {
        forecast = (
          await this.buildGoalForecastUseCase.execute({
            authUserId: input.authUserId,
          })
        ).goalForecast;
      }

      return {
        goal,
        progressSnapshot,
        forecast,
      };
    } catch (error) {
      if (
        error instanceof GoalReadError ||
        error instanceof BuildGoalProgressSnapshotError ||
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
