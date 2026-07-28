import { ApiClientError, type HttpClient } from './http-client';
import { createRecoveryApi } from './recovery-api';

describe('Recovery Experience API client', () => {
  it('gets the safe current Recovery Experience response', async () => {
    const response = {
      availability: 'available',
      recovery: null,
    } as const;
    const request = jest.fn().mockResolvedValue(response);
    const api = createRecoveryApi(buildHttpClient(request));

    await expect(api.getCurrentRecoveryExperience()).resolves.toBe(response);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/recovery/experience/current',
    });
  });

  it('gets history without an accidental undefined query', async () => {
    const request = jest.fn().mockResolvedValue({
      range: { days: 7 },
      items: [],
      trend: { direction: 'insufficient_data', comparedDays: 0 },
    });
    const api = createRecoveryApi(buildHttpClient(request));

    await api.getRecoveryExperienceHistory();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/recovery/experience/history',
    });
  });

  it.each([7, 30, 90])('serializes a valid history range: %s days', async (days) => {
    const request = jest.fn().mockResolvedValue({});
    const api = createRecoveryApi(buildHttpClient(request));

    await api.getRecoveryExperienceHistory({ days });

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: `/recovery/experience/history?days=${days}`,
    });
  });

  it.each([0, 91, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid history range: %s',
    async (days) => {
      const request = jest.fn();
      const api = createRecoveryApi(buildHttpClient(request));

      expect(() => api.getRecoveryExperienceHistory({ days })).toThrow(
        RangeError,
      );
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('preserves HTTP errors instead of converting them to unavailable data', async () => {
    const error = new ApiClientError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
      status: 401,
    });
    const request = jest.fn().mockRejectedValue(error);
    const api = createRecoveryApi(buildHttpClient(request));

    await expect(api.getCurrentRecoveryExperience()).rejects.toBe(error);
  });

  it('keeps legacy Recovery methods available', async () => {
    const request = jest.fn().mockResolvedValue({ recoverySnapshot: {} });
    const api = createRecoveryApi(buildHttpClient(request));

    await api.getCurrentRecovery();
    await api.getRecoveryHistory({ limit: 14 });

    expect(request).toHaveBeenNthCalledWith(1, {
      method: 'GET',
      path: '/recovery/current',
    });
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'GET',
      path: '/recovery/history?limit=14',
    });
  });
});

function buildHttpClient(request: jest.Mock): HttpClient {
  return { request } as unknown as HttpClient;
}
