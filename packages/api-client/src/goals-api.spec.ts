import { createGoalsApi } from './goals-api';
import type { HttpClient } from './http-client';

describe('createGoalsApi', () => {
  it('builds the correct current goal request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createGoalsApi(httpClient).getCurrentGoal();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/goals/current',
    });
  });

  it('builds the correct history request with limit', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createGoalsApi(httpClient).getGoalHistory({ limit: 14 });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/goals/history?limit=14',
    });
  });

  it('builds the correct milestones request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createGoalsApi(httpClient).getGoalMilestones();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/goals/milestones',
    });
  });

  it('builds the correct achievement history request with limit', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createGoalsApi(httpClient).getGoalAchievementHistory({ limit: 20 });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/goals/achievements?limit=20',
    });
  });

  it('builds the correct forecast request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createGoalsApi(httpClient).getGoalForecast();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/goals/forecast',
    });
  });
});

function buildHttpClient(request: jest.Mock) {
  return {
    request,
  } as unknown as HttpClient;
}
