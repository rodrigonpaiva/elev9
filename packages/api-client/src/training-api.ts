import type {
  GetAdaptiveTrainingHistoryResponse,
  GetCurrentAdaptiveTrainingResponse,
  GetTodayAdaptiveTrainingResponse,
  TrainingPlanResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createTrainingApi(httpClient: HttpClient) {
  return {
    getCurrentPlan(): Promise<TrainingPlanResponse> {
      return httpClient.request<TrainingPlanResponse>({
        method: 'GET',
        path: '/training/plans/current',
      });
    },

    getTodayAdaptiveTraining(): Promise<GetTodayAdaptiveTrainingResponse> {
      return httpClient.request<GetTodayAdaptiveTrainingResponse>({
        method: 'GET',
        path: '/training/adaptive/today',
      });
    },

    getCurrentAdaptiveTraining(): Promise<GetCurrentAdaptiveTrainingResponse> {
      return httpClient.request<GetCurrentAdaptiveTrainingResponse>({
        method: 'GET',
        path: '/training/adaptive/current',
      });
    },

    getAdaptiveTrainingHistory(input?: {
      limit?: number;
    }): Promise<GetAdaptiveTrainingHistoryResponse> {
      const query =
        input?.limit === undefined
          ? ''
          : `?limit=${encodeURIComponent(input.limit)}`;

      return httpClient.request<GetAdaptiveTrainingHistoryResponse>({
        method: 'GET',
        path: `/training/adaptive/history${query}`,
      });
    },
  };
}
