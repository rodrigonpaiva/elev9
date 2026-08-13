import { ApiClientError } from '@elev9/api-client';
import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';

import type { RecoveryScreenState } from './recovery-screen-state';

export type RecoveryCurrentResource =
  | { status: 'loading' }
  | {
      status: 'success';
      response: GetCurrentRecoveryExperienceResponse;
      dataSource?: 'network' | 'cache';
      cacheSavedAt?: string;
      cacheAge?: 'recent' | 'old';
      errorMessage?: string;
    }
  | { status: 'error'; message: string; isRetrying: boolean };

export type RecoveryHistoryResource =
  | { status: 'loading' }
  | {
      status: 'success';
      response: GetRecoveryExperienceHistoryResponse;
      dataSource?: 'network' | 'cache';
      cacheSavedAt?: string;
      cacheAge?: 'recent' | 'old';
    }
  | { status: 'error'; message: string };

export function buildRecoveryScreenState(input: {
  current: RecoveryCurrentResource;
  history: RecoveryHistoryResource;
  isRefreshing: boolean;
}): RecoveryScreenState {
  if (input.current.status === 'loading') {
    return { status: 'loading' };
  }

  if (input.current.status === 'error') {
    return {
      status: 'error',
      message: input.current.message,
      isRetrying: input.current.isRetrying,
    };
  }

  const currentResponse = input.current.response;
  if (
    currentResponse.availability !== 'available' ||
    currentResponse.recovery === null
  ) {
    return {
      status:
        currentResponse.availability === 'available'
          ? 'not_available'
          : currentResponse.availability,
      isRefreshing: input.isRefreshing,
    };
  }

  const history =
    input.history.status === 'success' ? input.history.response : null;

  return {
    status: 'available',
    current: currentResponse.recovery,
    history: history?.items ?? [],
    trend: history?.trend ?? {
      direction: 'insufficient_data',
      comparedDays: 0,
    },
    selectedRange: 7,
    isRefreshing: input.isRefreshing,
    historyStatus:
      input.history.status === 'loading'
        ? 'loading'
        : input.history.status === 'error'
          ? 'error'
          : 'available',
    historyErrorMessage:
      input.history.status === 'error' ? input.history.message : undefined,
    currentErrorMessage:
      input.current.status === 'success'
        ? input.current.errorMessage
        : undefined,
    ...(input.current.status === 'success' && input.current.dataSource
      ? {
          dataSource: input.current.dataSource,
          cacheSavedAt: input.current.cacheSavedAt,
          cacheAge: input.current.cacheAge,
        }
      : {}),
  };
}

export function mapRecoveryExperienceError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session may have expired. Please try again.';
    }

    if (error.status === 0 || error.code === 'NETWORK_ERROR') {
      return 'We couldn’t connect. Check your connection and try again.';
    }

    return 'We couldn’t load your Recovery right now.';
  }

  return 'We couldn’t load your Recovery right now.';
}

export function isRecoverableRecoveryNetworkError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 0 || error.code === 'NETWORK_ERROR')
  );
}
