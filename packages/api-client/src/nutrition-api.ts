import type {
  CalculateMacroTargetsResponse,
  CreateNutritionProfileRequest,
  CreateNutritionProfileResponse,
  CreateNutritionPlanResponse,
  GetCurrentNutritionPlanResponse,
  GetNutritionProfileResponse,
  GetNutritionRecommendationsResponse,
  GetTodayNutritionResponse,
  GetNutritionHistoryResponse,
  GetNutritionHistoryDayResponse,
  GetNutritionTrendsResponse,
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

    createNutritionProfile(
      input: CreateNutritionProfileRequest,
    ): Promise<CreateNutritionProfileResponse> {
      return httpClient.request<CreateNutritionProfileResponse>({
        method: 'POST',
        path: '/nutrition/profile',
        body: input,
      });
    },

    getNutritionProfile(): Promise<GetNutritionProfileResponse> {
      return httpClient.request<GetNutritionProfileResponse>({
        method: 'GET',
        path: '/nutrition/profile',
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

    getHistory(input?: {
      from?: string;
      to?: string;
      cursor?: string;
      limit?: number;
    }): Promise<GetNutritionHistoryResponse> {
      const params = new URLSearchParams();
      if (input?.from) params.set('from', input.from);
      if (input?.to) params.set('to', input.to);
      if (input?.cursor) params.set('cursor', input.cursor);
      if (input?.limit !== undefined) params.set('limit', String(input.limit));
      const query = params.toString();
      return httpClient.request<GetNutritionHistoryResponse>({
        method: 'GET',
        path: `/nutrition/history${query ? `?${query}` : ''}`,
      });
    },

    getHistoryDay(date: string): Promise<GetNutritionHistoryDayResponse> {
      return httpClient.request<GetNutritionHistoryDayResponse>({
        method: 'GET',
        path: `/nutrition/history/${encodeURIComponent(date)}`,
      });
    },

    getTrends(input?: {
      from?: string;
      to?: string;
    }): Promise<GetNutritionTrendsResponse> {
      const params = new URLSearchParams();
      if (input?.from) params.set('from', input.from);
      if (input?.to) params.set('to', input.to);
      const query = params.toString();
      return httpClient.request<GetNutritionTrendsResponse>({
        method: 'GET',
        path: `/nutrition/trends${query ? `?${query}` : ''}`,
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
