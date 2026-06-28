import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GOAL_ACHIEVEMENT_REPOSITORY,
  GoalAchievementRepository,
} from '../../../domain/repositories/goal-achievement.repository';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
  normalizeLimit,
  resolveUserProfileOrThrow,
} from '../../services/goal-seed.utils';
import { GetGoalAchievementHistoryInput } from './get-goal-achievement-history.input';
import { GetGoalAchievementHistoryOutput } from './get-goal-achievement-history.output';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class GetGoalAchievementHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_ACHIEVEMENT_REPOSITORY)
    private readonly goalAchievementRepository: GoalAchievementRepository,
  ) {}

  async execute(
    input: GetGoalAchievementHistoryInput,
  ): Promise<GetGoalAchievementHistoryOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
      });

      const limit = normalizeLimit(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const goalAchievements =
        await this.goalAchievementRepository.findManyByUserProfileId(
          userProfile.id,
        );

      return {
        goalAchievements: goalAchievements.slice(0, limit),
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
