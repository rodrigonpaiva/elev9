import { NutritionRecommendation } from '../../../domain/entities/nutrition-recommendation.entity';

export type GetNutritionRecommendationsOutput = {
  recommendations: NutritionRecommendation[];
};
