import { createAiApi } from './ai-api';
import { createAuthApi } from './auth-api';
import { createDashboardApi } from './dashboard-api';
import { createFitnessApi } from './fitness-api';
import { createHttpClient, type CreateHttpClientOptions } from './http-client';
import { createProgressApi } from './progress-api';
import { createTrainingApi } from './training-api';

export { ApiClientError } from './http-client';
export type { CreateHttpClientOptions, GetAccessToken } from './http-client';

export function createApiClient(options: CreateHttpClientOptions) {
  const httpClient = createHttpClient(options);

  return {
    auth: createAuthApi(httpClient),
    ai: createAiApi(httpClient),
    dashboard: createDashboardApi(httpClient),
    fitness: createFitnessApi(httpClient),
    training: createTrainingApi(httpClient),
    progress: createProgressApi(httpClient),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
