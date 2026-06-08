import type {
  GetConsistencySummaryResponse,
  GetCurrentHabitsResponse,
  GetHabitHistoryQuery,
  GetHabitHistoryResponse,
  GetHabitRiskSignalsResponse,
  GetTodayHabitsResponse,
  HabitReplayResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createHabitsApi(httpClient: HttpClient) {
  return {
    getTodayHabits(): Promise<GetTodayHabitsResponse> {
      return httpClient.request<GetTodayHabitsResponse>({
        method: 'GET',
        path: '/habits/today',
      });
    },

    getCurrentHabits(): Promise<GetCurrentHabitsResponse> {
      return httpClient.request<GetCurrentHabitsResponse>({
        method: 'GET',
        path: '/habits/current',
      });
    },

    getHabitHistory(
      query?: GetHabitHistoryQuery,
    ): Promise<GetHabitHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetHabitHistoryResponse>({
        method: 'GET',
        path: `/habits/history${suffix}`,
      });
    },

    getConsistencySummary(): Promise<GetConsistencySummaryResponse> {
      return httpClient.request<GetConsistencySummaryResponse>({
        method: 'GET',
        path: '/habits/summary',
      });
    },

    getHabitRiskSignals(): Promise<GetHabitRiskSignalsResponse> {
      return httpClient.request<GetHabitRiskSignalsResponse>({
        method: 'GET',
        path: '/habits/risk',
      });
    },

    replayHabitSnapshot(id: string): Promise<HabitReplayResponse> {
      return httpClient.request<HabitReplayResponse>({
        method: 'GET',
        path: `/habits/debug/${encodeURIComponent(id)}/replay`,
      });
    },
  };
}
