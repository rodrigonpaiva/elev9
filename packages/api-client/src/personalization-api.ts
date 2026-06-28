import type {
  GetBehavioralPatternsResponse,
  GetCurrentPersonalizationResponse,
  GetPersonalizationHistoryQuery,
  GetPersonalizationHistoryResponse,
  GetTodayPersonalizationResponse,
  PersonalizationReplayResponse,
  GetUserBehaviorProfileResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createPersonalizationApi(httpClient: HttpClient) {
  return {
    getTodayPersonalization(): Promise<GetTodayPersonalizationResponse> {
      return httpClient.request<GetTodayPersonalizationResponse>({
        method: 'GET',
        path: '/personalization/today',
      });
    },

    getCurrentPersonalization(): Promise<GetCurrentPersonalizationResponse> {
      return httpClient.request<GetCurrentPersonalizationResponse>({
        method: 'GET',
        path: '/personalization/current',
      });
    },

    getPersonalizationHistory(
      query?: GetPersonalizationHistoryQuery,
    ): Promise<GetPersonalizationHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetPersonalizationHistoryResponse>({
        method: 'GET',
        path: `/personalization/history${suffix}`,
      });
    },

    getBehavioralPatterns(): Promise<GetBehavioralPatternsResponse> {
      return httpClient.request<GetBehavioralPatternsResponse>({
        method: 'GET',
        path: '/personalization/patterns',
      });
    },

    getUserBehaviorProfile(): Promise<GetUserBehaviorProfileResponse> {
      return httpClient.request<GetUserBehaviorProfileResponse>({
        method: 'GET',
        path: '/personalization/profile',
      });
    },

    replayPersonalizationSnapshot(
      id: string,
    ): Promise<PersonalizationReplayResponse> {
      return httpClient.request<PersonalizationReplayResponse>({
        method: 'GET',
        path: `/personalization/debug/${encodeURIComponent(id)}/replay`,
      });
    },
  };
}
