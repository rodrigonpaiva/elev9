import type {
  GetCurrentRecoveryExperienceResponse,
  GetCurrentRecoveryResponse,
  GetRecoveryExperienceHistoryQuery,
  GetRecoveryExperienceHistoryResponse,
  GetRecoveryHistoryResponse,
  GetTodayRecoveryResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createRecoveryApi(httpClient: HttpClient) {
  return {
    getTodayRecovery(): Promise<GetTodayRecoveryResponse> {
      return httpClient.request<GetTodayRecoveryResponse>({
        method: 'GET',
        path: '/recovery/today',
      });
    },

    getCurrentRecovery(): Promise<GetCurrentRecoveryResponse> {
      return httpClient.request<GetCurrentRecoveryResponse>({
        method: 'GET',
        path: '/recovery/current',
      });
    },

    getCurrentRecoveryExperience(): Promise<GetCurrentRecoveryExperienceResponse> {
      return httpClient.request<GetCurrentRecoveryExperienceResponse>({
        method: 'GET',
        path: '/recovery/experience/current',
      });
    },

    getRecoveryHistory(input?: {
      limit?: number;
    }): Promise<GetRecoveryHistoryResponse> {
      const query =
        input?.limit === undefined
          ? ''
          : `?limit=${encodeURIComponent(input.limit)}`;

      return httpClient.request<GetRecoveryHistoryResponse>({
        method: 'GET',
        path: `/recovery/history${query}`,
      });
    },

    getRecoveryExperienceHistory(
      input?: GetRecoveryExperienceHistoryQuery,
    ): Promise<GetRecoveryExperienceHistoryResponse> {
      const days = input?.days;
      if (days !== undefined) {
        validateHistoryDays(days);
      }

      const query =
        days === undefined ? '' : `?days=${encodeURIComponent(days)}`;

      return httpClient.request<GetRecoveryExperienceHistoryResponse>({
        method: 'GET',
        path: `/recovery/experience/history${query}`,
      });
    },
  };
}

function validateHistoryDays(days: number): void {
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new RangeError(
      'Recovery history days must be an integer between 1 and 90.',
    );
  }
}
