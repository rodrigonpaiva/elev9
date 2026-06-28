import { createHabitsApi } from './habits-api';
import type { HttpClient } from './http-client';

describe('createHabitsApi', () => {
  it('builds the correct today habits request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).getTodayHabits();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/today',
    });
  });

  it('builds the correct current habits request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).getCurrentHabits();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/current',
    });
  });

  it('builds the correct history request with limit', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).getHabitHistory({ limit: 14 });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/history?limit=14',
    });
  });

  it('builds the correct summary request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).getConsistencySummary();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/summary',
    });
  });

  it('builds the correct risk signal request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).getHabitRiskSignals();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/risk',
    });
  });

  it('builds the correct habit snapshot replay request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createHabitsApi(httpClient).replayHabitSnapshot('snapshot/123');

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/habits/debug/snapshot%2F123/replay',
    });
  });
});

function buildHttpClient(request: jest.Mock) {
  return {
    request,
  } as unknown as HttpClient;
}
