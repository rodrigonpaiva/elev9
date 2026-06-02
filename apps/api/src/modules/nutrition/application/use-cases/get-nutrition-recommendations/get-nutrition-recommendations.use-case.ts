import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  NUTRITION_RECOMMENDATION_REPOSITORY,
  NutritionRecommendationRepository,
} from '../../../domain/repositories/nutrition-recommendation.repository';
import {
  GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES,
  GetNutritionRecommendationsError,
} from './get-nutrition-recommendations.errors';
import { GetNutritionRecommendationsOutput } from './get-nutrition-recommendations.output';

@Injectable()
export class GetNutritionRecommendationsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_RECOMMENDATION_REPOSITORY)
    private readonly nutritionRecommendationRepository: NutritionRecommendationRepository,
  ) {}

  async execute(input: {
    authUserId: string;
    limit?: number;
  }): Promise<GetNutritionRecommendationsOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetNutritionRecommendationsError(
        GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const limit = input.limit ?? 10;

    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new GetNutritionRecommendationsError(
        GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INVALID_LIMIT,
        'limit must be between 1 and 50.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetNutritionRecommendationsError(
          GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      return {
        recommendations:
          await this.nutritionRecommendationRepository.findManyByUserProfileId(
            userProfile.id,
            limit,
          ),
      };
    } catch (error) {
      if (error instanceof GetNutritionRecommendationsError) {
        throw error;
      }

      throw new GetNutritionRecommendationsError(
        GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
