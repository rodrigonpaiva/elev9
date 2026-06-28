import type {
  GetGoalAchievementHistoryQuery,
  GetGoalAchievementHistoryResponse,
  GetGoalForecastResponse,
  GetGoalHistoryQuery,
  GetGoalHistoryResponse,
  GetGoalMilestonesResponse,
  GetCurrentGoalResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createGoalsApi(httpClient: HttpClient) {
  return {
    getCurrentGoal(): Promise<GetCurrentGoalResponse> {
      return httpClient.request<GetCurrentGoalResponse>({
        method: 'GET',
        path: '/goals/current',
      });
    },

    getGoalHistory(
      query?: GetGoalHistoryQuery,
    ): Promise<GetGoalHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetGoalHistoryResponse>({
        method: 'GET',
        path: `/goals/history${suffix}`,
      });
    },

    getGoalMilestones(): Promise<GetGoalMilestonesResponse> {
      return httpClient.request<GetGoalMilestonesResponse>({
        method: 'GET',
        path: '/goals/milestones',
      });
    },

    getGoalAchievementHistory(
      query?: GetGoalAchievementHistoryQuery,
    ): Promise<GetGoalAchievementHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetGoalAchievementHistoryResponse>({
        method: 'GET',
        path: `/goals/achievements${suffix}`,
      });
    },

    getGoalForecast(): Promise<GetGoalForecastResponse> {
      return httpClient.request<GetGoalForecastResponse>({
        method: 'GET',
        path: '/goals/forecast',
      });
    },
  };
}
