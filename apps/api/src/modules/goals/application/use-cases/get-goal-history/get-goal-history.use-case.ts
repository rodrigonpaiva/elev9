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
import { GoalDateService } from '../../services/goal-date.service';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
  normalizeLimit,
  resolveActiveGoalOrSeed,
  resolveUserProfileOrThrow,
} from '../../services/goal-seed.utils';
import { GetGoalHistoryInput } from './get-goal-history.input';
import { GetGoalHistoryOutput } from './get-goal-history.output';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetGoalHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(input: GetGoalHistoryInput): Promise<GetGoalHistoryOutput> {
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

      const limit = normalizeLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const goalProgressSnapshots =
        await this.goalProgressSnapshotRepository.findManyByGoalId(goal.id, {
          limit,
        });

      return {
        goalProgressSnapshots,
        limit,
      };
    } catch (error) {
      if (error instanceof GoalReadError) {
        throw error;
      }

      throw new GoalReadError(
        GOAL_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
