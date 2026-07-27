import { ApiClientError } from '@elev9/api-client';

import { mapDailyCheckInError } from './daily-check-in-integration';

describe('daily check-in integration error mapping', () => {
  it('maps network failures to a retryable safe message', () => {
    expect(
      mapDailyCheckInError(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'network details',
          status: 0,
        }),
      ),
    ).toEqual({
      code: 'NETWORK_ERROR',
      message: 'We could not connect. Check your connection and try again.',
      retryable: true,
    });
  });

  it('keeps session errors distinct from recoverable API errors', () => {
    expect(
      mapDailyCheckInError(
        new ApiClientError({
          code: 'AUTH_INVALID_SESSION',
          message: 'token details',
          status: 401,
        }),
      ).code,
    ).toBe('SESSION_EXPIRED');
    expect(
      mapDailyCheckInError(
        new ApiClientError({
          code: 'RECOVERY_RECALCULATION_FAILED',
          message: 'recovery details',
          status: 500,
        }),
      ).code,
    ).toBe('RECOVERY_FAILED');
  });

  it('does not expose transport details for unknown errors', () => {
    expect(mapDailyCheckInError(new Error('internal detail'))).toEqual({
      code: 'UNKNOWN',
      message: 'We could not load your check-in. Please try again.',
      retryable: true,
    });
  });
});
