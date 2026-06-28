import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../domain/repositories/adaptive-training-recommendation.repository';
import {
  GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES,
  GetAdaptiveTrainingHistoryError,
} from './get-adaptive-training-history.errors';
import { GetAdaptiveTrainingHistoryInput } from './get-adaptive-training-history.input';
import { GetAdaptiveTrainingHistoryOutput } from './get-adaptive-training-history.output';

const DEFAULT_LIMIT = 14;
const MAX_LIMIT = 90;

@Injectable()
export class GetAdaptiveTrainingHistoryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
  ) {}

  async execute(
    input: GetAdaptiveTrainingHistoryInput,
  ): Promise<GetAdaptiveTrainingHistoryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetAdaptiveTrainingHistoryError(
        GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const limit = this.resolveLimit(input.limit);
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetAdaptiveTrainingHistoryError(
          GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const adaptiveTrainingRecommendations =
        await this.adaptiveTrainingRecommendationRepository.findRecentByUserProfileId(
          userProfile.id,
          {
            limit,
          },
        );

      return {
        adaptiveTrainingRecommendations,
      };
    } catch (error) {
      if (error instanceof GetAdaptiveTrainingHistoryError) {
        throw error;
      }

      throw new GetAdaptiveTrainingHistoryError(
        GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_LIMIT;
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      throw new GetAdaptiveTrainingHistoryError(
        GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Invalid adaptive training history limit.',
      );
    }

    return limit;
  }
}
