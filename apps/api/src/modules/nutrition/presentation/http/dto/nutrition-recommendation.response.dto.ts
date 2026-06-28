type NutritionRecommendationDto = {
  id?: string;
  userProfileId?: string;
  message: string;
  recommendations: string[];
  influences: string[];
  generatorVersion: string;
  contextSnapshot: Record<string, unknown>;
  createdAt?: string;
};

export class GenerateNutritionRecommendationResponseDto {
  nutritionRecommendation!: NutritionRecommendationDto;
}

export class GetNutritionRecommendationsResponseDto {
  recommendations!: NutritionRecommendationDto[];
}
