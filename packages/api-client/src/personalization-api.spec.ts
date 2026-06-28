import { createPersonalizationApi } from './personalization-api';
import type { HttpClient } from './http-client';

describe('createPersonalizationApi', () => {
  it('builds the correct today request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).getTodayPersonalization();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/today',
    });
  });

  it('builds the correct current request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).getCurrentPersonalization();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/current',
    });
  });

  it('builds the correct history request with limit', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).getPersonalizationHistory({
      limit: 14,
    });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/history?limit=14',
    });
  });

  it('builds the correct behavioral patterns request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).getBehavioralPatterns();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/patterns',
    });
  });

  it('builds the correct user behavior profile request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).getUserBehaviorProfile();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/profile',
    });
  });

  it('builds the correct replay request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createPersonalizationApi(httpClient).replayPersonalizationSnapshot(
      'snapshot/123',
    );

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/personalization/debug/snapshot%2F123/replay',
    });
  });
});

function buildHttpClient(request: jest.Mock) {
  return {
    request,
  } as unknown as HttpClient;
}
