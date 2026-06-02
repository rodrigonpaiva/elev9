import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import {
  GET_CURRENT_NUTRITION_PLAN_ERROR_CODES,
  GetCurrentNutritionPlanError,
} from './get-current-nutrition-plan.errors';
import { GetCurrentNutritionPlanOutput } from './get-current-nutrition-plan.output';

@Injectable()
export class GetCurrentNutritionPlanUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetCurrentNutritionPlanOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetCurrentNutritionPlanError(
        GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetCurrentNutritionPlanError(
          GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionPlan =
        await this.nutritionPlanRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionPlan) {
        throw new GetCurrentNutritionPlanError(
          GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
          'Active nutrition plan not found.',
        );
      }

      return { nutritionPlan };
    } catch (error) {
      if (error instanceof GetCurrentNutritionPlanError) {
        throw error;
      }

      throw new GetCurrentNutritionPlanError(
        GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
