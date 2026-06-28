import { createAiApi } from './ai-api';
import { createAuthApi } from './auth-api';
import { createDashboardApi } from './dashboard-api';
import { createFitnessApi } from './fitness-api';
import { createGoalsApi } from './goals-api';
import { createHttpClient, type CreateHttpClientOptions } from './http-client';
import { createHabitsApi } from './habits-api';
import { createNutritionApi } from './nutrition-api';
import { createNotificationsApi } from './notifications-api';
import { createPersonalizationApi } from './personalization-api';
import { createProgressApi } from './progress-api';
import { createRecoveryApi } from './recovery-api';
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
    goals: createGoalsApi(httpClient),
    habits: createHabitsApi(httpClient),
    nutrition: createNutritionApi(httpClient),
    notifications: createNotificationsApi(httpClient),
    personalization: createPersonalizationApi(httpClient),
    recovery: createRecoveryApi(httpClient),
    training: createTrainingApi(httpClient),
    progress: createProgressApi(httpClient),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
