import { Inject, Injectable } from '@nestjs/common';

import { BuildAdaptiveTrainingRecommendationUseCase } from '../build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../domain/repositories/adaptive-training-recommendation.repository';
import {
  GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES,
  GetCurrentAdaptiveTrainingError,
} from './get-current-adaptive-training.errors';
import { GetCurrentAdaptiveTrainingInput } from './get-current-adaptive-training.input';
import { GetCurrentAdaptiveTrainingOutput } from './get-current-adaptive-training.output';

@Injectable()
export class GetCurrentAdaptiveTrainingUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    private readonly buildAdaptiveTrainingRecommendationUseCase: BuildAdaptiveTrainingRecommendationUseCase,
  ) {}

  async execute(
    input: GetCurrentAdaptiveTrainingInput,
  ): Promise<GetCurrentAdaptiveTrainingOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCurrentAdaptiveTrainingError(
        GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCurrentAdaptiveTrainingError(
          GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestRecommendation =
        await this.adaptiveTrainingRecommendationRepository.findLatestByUserProfileId(
          userProfile.id,
        );

      if (latestRecommendation) {
        return {
          adaptiveTrainingRecommendation: latestRecommendation,
        };
      }

      return await this.buildAdaptiveTrainingRecommendationUseCase.execute({
        authUserId,
      });
    } catch (error) {
      if (error instanceof GetCurrentAdaptiveTrainingError) {
        throw error;
      }

      throw new GetCurrentAdaptiveTrainingError(
        GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
