import type {
  CalculateMacroTargetsResponse,
  CreateNutritionPlanResponse,
  GetCurrentNutritionPlanResponse,
  GetNutritionRecommendationsResponse,
  GetTodayNutritionResponse,
  GenerateNutritionRecommendationResponse,
  LogMealRequest,
  LogMealResponse,
  ReplaceMealRequest,
  ReplaceMealResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createNutritionApi(httpClient: HttpClient) {
  return {
    calculateMacroTargets(): Promise<CalculateMacroTargetsResponse> {
      return httpClient.request<CalculateMacroTargetsResponse>({
        method: 'POST',
        path: '/nutrition/macro-targets/calculate',
      });
    },

    createNutritionPlan(): Promise<CreateNutritionPlanResponse> {
      return httpClient.request<CreateNutritionPlanResponse>({
        method: 'POST',
        path: '/nutrition/plans',
      });
    },

    getCurrentNutritionPlan(): Promise<GetCurrentNutritionPlanResponse> {
      return httpClient.request<GetCurrentNutritionPlanResponse>({
        method: 'GET',
        path: '/nutrition/plans/current',
      });
    },

    getTodayNutrition(): Promise<GetTodayNutritionResponse> {
      return httpClient.request<GetTodayNutritionResponse>({
        method: 'GET',
        path: '/nutrition/today',
      });
    },

    logMeal(input: LogMealRequest): Promise<LogMealResponse> {
      return httpClient.request<LogMealResponse>({
        method: 'POST',
        path: '/nutrition/logs',
        body: input,
      });
    },

    replaceMeal(
      mealId: string,
      input?: ReplaceMealRequest,
    ): Promise<ReplaceMealResponse> {
      const encodedMealId = encodeURIComponent(mealId);

      return httpClient.request<ReplaceMealResponse>({
        method: 'POST',
        path: `/nutrition/meals/${encodedMealId}/replace`,
        body: input ?? {},
      });
    },

    generateNutritionRecommendation(): Promise<GenerateNutritionRecommendationResponse> {
      return httpClient.request<GenerateNutritionRecommendationResponse>({
        method: 'POST',
        path: '/nutrition/recommendations',
      });
    },

    getNutritionRecommendations(input?: {
      limit?: number;
    }): Promise<GetNutritionRecommendationsResponse> {
      const query =
        input?.limit === undefined
          ? ''
          : `?limit=${encodeURIComponent(input.limit)}`;

      return httpClient.request<GetNutritionRecommendationsResponse>({
        method: 'GET',
        path: `/nutrition/recommendations${query}`,
      });
    },
  };
}
