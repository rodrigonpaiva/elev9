import { Inject, Injectable } from '@nestjs/common';

import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../domain/repositories/coach-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_COACH_DECISION_HISTORY_ERROR_CODES,
  GetCoachDecisionHistoryError,
} from './get-coach-decision-history.errors';
import { GetCoachDecisionHistoryInput } from './get-coach-decision-history.input';
import { GetCoachDecisionHistoryOutput } from './get-coach-decision-history.output';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetCoachDecisionHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
  ) {}

  async execute(
    input: GetCoachDecisionHistoryInput,
  ): Promise<GetCoachDecisionHistoryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCoachDecisionHistoryError(
        GET_COACH_DECISION_HISTORY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const limit = input.limit ?? DEFAULT_LIMIT;

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new GetCoachDecisionHistoryError(
        GET_COACH_DECISION_HISTORY_ERROR_CODES.INVALID_LIMIT,
        `limit must be between 1 and ${MAX_LIMIT}.`,
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCoachDecisionHistoryError(
          GET_COACH_DECISION_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      return {
        coachDecisions:
          await this.coachDecisionRepository.findManyByUserProfileId(
            userProfile.id,
            {
              limit,
            },
          ),
      };
    } catch (error) {
      if (error instanceof GetCoachDecisionHistoryError) {
        throw error;
      }

      throw new GetCoachDecisionHistoryError(
        GET_COACH_DECISION_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
