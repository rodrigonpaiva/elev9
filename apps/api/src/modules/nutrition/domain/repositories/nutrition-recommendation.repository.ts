import {
  NutritionContextSnapshot,
  NutritionInfluence,
  NutritionRecommendation,
} from '../entities/nutrition-recommendation.entity';

export interface CreateNutritionRecommendationRepositoryInput {
  userProfileId: string;
  message: string;
  recommendations: string[];
  influences: NutritionInfluence[];
  generatorVersion: string;
  contextSnapshot: NutritionContextSnapshot;
}

export interface NutritionRecommendationRepository {
  create(
    input: CreateNutritionRecommendationRepositoryInput,
  ): Promise<NutritionRecommendation>;
  findManyByUserProfileId(
    userProfileId: string,
    limit: number,
  ): Promise<NutritionRecommendation[]>;
}

export const NUTRITION_RECOMMENDATION_REPOSITORY = Symbol(
  'NUTRITION_RECOMMENDATION_REPOSITORY',
);
