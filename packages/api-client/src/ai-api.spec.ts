import { createAiApi } from './ai-api';
import type { HttpClient } from './http-client';

describe('createAiApi', () => {
  it('builds the canonical coach intelligence request', async () => {
    const request = jest.fn().mockResolvedValue({});
    const httpClient = buildHttpClient(request);

    await createAiApi(httpClient).getCoachIntelligence();

    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/ai/coach-intelligence',
    });
  });
});

function buildHttpClient(request: jest.Mock) {
  return {
    request,
  } as unknown as HttpClient;
}
