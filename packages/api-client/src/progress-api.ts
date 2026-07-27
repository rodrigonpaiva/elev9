import type {
  DailyCheckInHistoryResponse,
  GetDailyCheckInHistoryQuery,
  GetTodayDailyCheckInResponse,
  ProgressSummaryResponse,
  SubmitDailyCheckInRequest,
  SubmitDailyCheckInResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createProgressApi(httpClient: HttpClient) {
  const submitDailyCheckIn = (
    input: SubmitDailyCheckInRequest,
  ): Promise<SubmitDailyCheckInResponse> =>
    httpClient.request<SubmitDailyCheckInResponse>({
      method: 'POST',
      path: '/progress/daily-check-in',
      body: input,
    });

  return {
    submitDailyCheckIn,
    /** @deprecated Use submitDailyCheckIn. */
    createDailyCheckIn: submitDailyCheckIn,
    getTodayDailyCheckIn(): Promise<GetTodayDailyCheckInResponse> {
      return httpClient.request<GetTodayDailyCheckInResponse>({
        method: 'GET',
        path: '/progress/daily-check-in/today',
      });
    },
    getDailyCheckInHistory(
      query?: GetDailyCheckInHistoryQuery,
    ): Promise<DailyCheckInHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<DailyCheckInHistoryResponse>({
        method: 'GET',
        path: `/progress/daily-check-ins${suffix}`,
      });
    },
    getSummary(period?: 'week' | 'month'): Promise<ProgressSummaryResponse> {
      const query = period ? `?period=${period}` : '';

      return httpClient.request<ProgressSummaryResponse>({
        method: 'GET',
        path: `/progress/summary${query}`,
      });
    },
  };
}
