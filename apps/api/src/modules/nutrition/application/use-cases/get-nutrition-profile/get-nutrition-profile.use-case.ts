import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../domain/repositories/nutrition-profile.repository';
import {
  GET_NUTRITION_PROFILE_ERROR_CODES,
  GetNutritionProfileError,
} from './get-nutrition-profile.errors';
import { GetNutritionProfileOutput } from './get-nutrition-profile.output';

@Injectable()
export class GetNutritionProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetNutritionProfileOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetNutritionProfileError(
        GET_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetNutritionProfileError(
          GET_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionProfile) {
        throw new GetNutritionProfileError(
          GET_NUTRITION_PROFILE_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
          'Nutrition profile not found.',
        );
      }

      return {
        nutritionProfile: {
          id: nutritionProfile.id,
          userProfileId: nutritionProfile.userProfileId,
          goal: nutritionProfile.goal,
          mealsPerDay: nutritionProfile.mealsPerDay,
          dietaryRestrictions: nutritionProfile.dietaryRestrictions ?? [],
          allergies: nutritionProfile.allergies ?? [],
          dislikedFoods: nutritionProfile.dislikedFoods ?? [],
          preferredFoods: nutritionProfile.preferredFoods ?? [],
          status: nutritionProfile.status,
          createdAt: nutritionProfile.createdAt,
          updatedAt: nutritionProfile.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof GetNutritionProfileError) {
        throw error;
      }

      throw new GetNutritionProfileError(
        GET_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
