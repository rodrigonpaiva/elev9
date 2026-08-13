import { ApiClientError } from '@elev9/api-client';

import type { GetTodayDailyCheckInResponse } from '@elev9/types';
import type { DailyCheckInMode } from './daily-check-in-form-state';

export type DailyCheckInUiErrorCode =
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'PROFILE_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'RECOVERY_FAILED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export type DailyCheckInUiError = {
  code: DailyCheckInUiErrorCode;
  message: string;
  retryable: boolean;
};

export function resolveDailyCheckInMode(
  todayState: GetTodayDailyCheckInResponse,
): DailyCheckInMode {
  return todayState.dailyCheckIn ? 'edit' : 'create';
}

export function mapDailyCheckInError(error: unknown): DailyCheckInUiError {
  if (!(error instanceof ApiClientError)) {
    return {
      code: 'UNKNOWN',
      message: 'We could not load your check-in. Please try again.',
      retryable: true,
    };
  }

  if (error.code === 'NETWORK_ERROR') {
    return {
      code: 'NETWORK_ERROR',
      message: 'We could not connect. Check your connection and try again.',
      retryable: true,
    };
  }

  if (error.code === 'AUTH_INVALID_SESSION' || error.status === 401) {
    return {
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please sign in again.',
      retryable: false,
    };
  }

  if (error.code === 'USER_PROFILE_NOT_FOUND') {
    return {
      code: 'PROFILE_UNAVAILABLE',
      message: 'Your profile is not ready yet. Please try again shortly.',
      retryable: true,
    };
  }

  if (
    error.code === 'RECOVERY_RECALCULATION_FAILED' ||
    error.code === 'RECOVERY_FAILED'
  ) {
    return {
      code: 'RECOVERY_FAILED',
      message: 'Your check-in could not be fully processed. Please try again.',
      retryable: true,
    };
  }

  if (
    error.code === 'INVALID_INPUT' ||
    error.code === 'BAD_REQUEST' ||
    error.status === 400
  ) {
    return {
      code: 'INVALID_INPUT',
      message: 'Please review your answers and try again.',
      retryable: true,
    };
  }

  if (typeof error.status === 'number' && error.status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'We could not save your check-in. Please try again.',
      retryable: true,
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'We could not save your check-in. Please try again.',
    retryable: true,
  };
}
