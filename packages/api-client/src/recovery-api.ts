import type {
  GetCurrentRecoveryResponse,
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

    getRecoveryHistory(input?: { limit?: number }): Promise<GetRecoveryHistoryResponse> {
      const query =
        input?.limit === undefined
          ? ''
          : `?limit=${encodeURIComponent(input.limit)}`;

      return httpClient.request<GetRecoveryHistoryResponse>({
        method: 'GET',
        path: `/recovery/history${query}`,
      });
    },
  };
}
