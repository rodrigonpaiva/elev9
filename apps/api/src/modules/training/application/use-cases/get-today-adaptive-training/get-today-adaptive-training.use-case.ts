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
  GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES,
  GetTodayAdaptiveTrainingError,
} from './get-today-adaptive-training.errors';
import { GetTodayAdaptiveTrainingInput } from './get-today-adaptive-training.input';
import { GetTodayAdaptiveTrainingOutput } from './get-today-adaptive-training.output';
import { AdaptiveTrainingDateService } from '../../services/adaptive-training-date.service';

@Injectable()
export class GetTodayAdaptiveTrainingUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    private readonly buildAdaptiveTrainingRecommendationUseCase: BuildAdaptiveTrainingRecommendationUseCase,
    private readonly adaptiveTrainingDateService: AdaptiveTrainingDateService,
  ) {}

  async execute(
    input: GetTodayAdaptiveTrainingInput,
  ): Promise<GetTodayAdaptiveTrainingOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayAdaptiveTrainingError(
        GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayAdaptiveTrainingError(
          GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.adaptiveTrainingDateService.todayUtcDateString();
      const existingRecommendation =
        await this.adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      if (existingRecommendation) {
        return {
          adaptiveTrainingRecommendation: existingRecommendation,
        };
      }

      return await this.buildAdaptiveTrainingRecommendationUseCase.execute({
        authUserId,
      });
    } catch (error) {
      if (error instanceof GetTodayAdaptiveTrainingError) {
        throw error;
      }

      throw new GetTodayAdaptiveTrainingError(
        GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
