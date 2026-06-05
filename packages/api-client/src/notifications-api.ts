import type {
  GetCurrentNotificationResponse,
  GetEngagementSummaryResponse,
  GetNotificationHistoryQuery,
  GetNotificationHistoryResponse,
  GetTodayNotificationResponse,
  NotificationReplayResponse,
  RecordEngagementEventRequest,
  RecordEngagementEventResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createNotificationsApi(httpClient: HttpClient) {
  return {
    getTodayNotification(): Promise<GetTodayNotificationResponse> {
      return httpClient.request<GetTodayNotificationResponse>({
        method: 'GET',
        path: '/notifications/today',
      });
    },

    getCurrentNotification(): Promise<GetCurrentNotificationResponse> {
      return httpClient.request<GetCurrentNotificationResponse>({
        method: 'GET',
        path: '/notifications/current',
      });
    },

    getNotificationHistory(
      query?: GetNotificationHistoryQuery,
    ): Promise<GetNotificationHistoryResponse> {
      const searchParams = new URLSearchParams();

      if (query?.limit !== undefined) {
        searchParams.set('limit', String(query.limit));
      }

      const suffix =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : '';

      return httpClient.request<GetNotificationHistoryResponse>({
        method: 'GET',
        path: `/notifications/history${suffix}`,
      });
    },

    getEngagementSummary(): Promise<GetEngagementSummaryResponse> {
      return httpClient.request<GetEngagementSummaryResponse>({
        method: 'GET',
        path: '/notifications/engagement-summary',
      });
    },

    recordEngagementEvent(
      notificationId: string,
      input: RecordEngagementEventRequest,
    ): Promise<RecordEngagementEventResponse> {
      return httpClient.request<RecordEngagementEventResponse>({
        method: 'POST',
        path: `/notifications/${encodeURIComponent(notificationId)}/events`,
        body: input,
      });
    },

    replayNotificationDecision(
      notificationId: string,
    ): Promise<NotificationReplayResponse> {
      return httpClient.request<NotificationReplayResponse>({
        method: 'GET',
        path: `/notifications/debug/${encodeURIComponent(notificationId)}/replay`,
      });
    },
  };
}
