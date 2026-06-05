import {
  AdaptiveTrainingRecommendation,
} from '../entities/adaptive-training-recommendation.entity';
import {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveVolumeAction,
} from '../value-objects/adaptive-recommendation-type.value-object';
import {
  AdaptiveTrainingInfluenceProps,
} from '../value-objects/adaptive-training-influence.value-object';
import type { AdaptiveTrainingSourceContext } from '../../../../shared/source-context';

export interface AdaptiveTrainingRecommendationQueryOptions {
  limit?: number;
}

export interface UpsertAdaptiveTrainingRecommendationRepositoryInput {
  userProfileId: string;
  trainingPlanId?: string;
  date: string;
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluenceProps[];
  sourceContext: AdaptiveTrainingSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic';
}

export interface AdaptiveTrainingRecommendationRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<AdaptiveTrainingRecommendation | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<AdaptiveTrainingRecommendation | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: AdaptiveTrainingRecommendationQueryOptions,
  ): Promise<AdaptiveTrainingRecommendation[]>;
  findRecentByUserProfileId(
    userProfileId: string,
    options?: AdaptiveTrainingRecommendationQueryOptions,
  ): Promise<AdaptiveTrainingRecommendation[]>;
  upsertDailyRecommendation(
    input: UpsertAdaptiveTrainingRecommendationRepositoryInput,
  ): Promise<AdaptiveTrainingRecommendation>;
}

export const ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY = Symbol(
  'ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY',
);
