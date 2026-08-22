import type {
  DailyCheckInHistoryResponse,
  GetDailyCheckInHistoryQuery,
  GetTodayDailyCheckInResponse,
  ProgressSummaryResponse,
  SubmitDailyCheckInRequest,
  SubmitDailyCheckInResponse,
  StartWorkoutRequest,
  StartWorkoutResponse,
  CompleteWorkoutResponse,
  ReplaceWorkoutExerciseRequest,
  ReplaceWorkoutExerciseResponse,
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

  const startWorkout = (
    input: StartWorkoutRequest,
  ): Promise<StartWorkoutResponse> =>
    httpClient.request<StartWorkoutResponse>({
      method: 'POST',
      path: '/progress/workout-sessions/start',
      body: input,
    });

  const completeWorkout = (
    sessionId: string,
  ): Promise<CompleteWorkoutResponse> =>
    httpClient.request<CompleteWorkoutResponse>({
      method: 'POST',
      path: `/progress/workout-sessions/${sessionId}/complete`,
    });

  const getWorkoutSession = (
    sessionId: string,
  ): Promise<CompleteWorkoutResponse> =>
    httpClient.request<CompleteWorkoutResponse>({
      method: 'GET',
      path: `/progress/workout-sessions/${sessionId}`,
    });

  const replaceWorkoutExercise = (
    sessionId: string,
    input: ReplaceWorkoutExerciseRequest,
  ): Promise<ReplaceWorkoutExerciseResponse> =>
    httpClient.request<ReplaceWorkoutExerciseResponse>({
      method: 'POST',
      path: `/progress/workout-sessions/${sessionId}/replacements`,
      body: input,
    });

  return {
    submitDailyCheckIn,
    startWorkout,
    completeWorkout,
    getWorkoutSession,
    replaceWorkoutExercise,
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
