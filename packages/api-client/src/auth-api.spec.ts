import type { HttpClient } from './http-client';
import { createAuthApi } from './auth-api';

describe('Auth API client', () => {
  it('validates the persisted session through GET /auth/me', async () => {
    const response = { user: { id: 'user_1', email: 'user@email.com' } };
    const request = jest.fn().mockResolvedValue(response);
    const api = createAuthApi(buildHttpClient(request));

    await expect(api.me()).resolves.toBe(response);
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/auth/me',
    });
  });

  it('keeps authentication errors from session validation', async () => {
    const error = new Error('Invalid session.');
    const request = jest.fn().mockRejectedValue(error);
    const api = createAuthApi(buildHttpClient(request));

    await expect(api.me()).rejects.toBe(error);
  });
});

function buildHttpClient(request: jest.Mock): HttpClient {
  return { request } as unknown as HttpClient;
}
