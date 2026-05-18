import type {
  DashboardHomeDebugResponse,
  DashboardHomeResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createDashboardApi(httpClient: HttpClient) {
  return {
    getHome(): Promise<DashboardHomeResponse> {
      return httpClient.request<DashboardHomeResponse>({
        method: 'GET',
        path: '/dashboard/home',
      });
    },
    getHomeDebug(): Promise<DashboardHomeDebugResponse> {
      return httpClient.request<DashboardHomeDebugResponse>({
        method: 'GET',
        path: '/dashboard/home/debug',
      });
    },
  };
}
