import { createNotificationsApi } from './notifications-api';
import type { HttpClient } from './http-client';

describe('createNotificationsApi', () => {
  it('builds the correct today notification request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).getTodayNotification();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/notifications/today',
    });
  });

  it('builds the correct current notification request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).getCurrentNotification();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/notifications/current',
    });
  });

  it('builds the correct history request with limit', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).getNotificationHistory({ limit: 14 });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/notifications/history?limit=14',
    });
  });

  it('builds the correct engagement summary request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).getEngagementSummary();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/notifications/engagement-summary',
    });
  });

  it('builds the correct engagement event request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).recordEngagementEvent(
      'notification_123',
      {
        type: 'opened',
        metadata: {
          source: 'dashboard',
        },
      },
    );

    expect(request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/notifications/notification_123/events',
      body: {
        type: 'opened',
        metadata: {
          source: 'dashboard',
        },
      },
    });
  });

  it('builds the correct replay request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createNotificationsApi(httpClient).replayNotificationDecision(
      'notification_123',
    );

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/notifications/debug/notification_123/replay',
    });
  });
});

function buildHttpClient(request: jest.Mock) {
  return {
    request,
  } as unknown as HttpClient;
}
