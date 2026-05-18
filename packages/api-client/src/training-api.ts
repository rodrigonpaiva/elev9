import type { TrainingPlanResponse } from '@elev9/types';

import type { HttpClient } from './http-client';

export function createTrainingApi(httpClient: HttpClient) {
  return {
    getCurrentPlan(): Promise<TrainingPlanResponse> {
      return httpClient.request<TrainingPlanResponse>({
        method: 'GET',
        path: '/training/plans/current',
      });
    },
  };
}
