import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';
import { ApiClientError } from '@elev9/api-client';

import {
  buildRecoveryScreenState,
  isRecoverableRecoveryNetworkError,
  mapRecoveryExperienceError,
  type RecoveryCurrentResource,
  type RecoveryHistoryResource,
} from './recovery-screen-state-mapper';

const current: GetCurrentRecoveryExperienceResponse = {
  availability: 'available',
  recovery: {
    score: 78,
    fatigueScore: 32,
    category: 'good',
    freshness: 'current',
    lastUpdatedAt: '2026-07-28T10:15:00.000Z',
    trend: 'improving',
    breakdown: [],
    insight: {
      tone: 'positive',
      titleKey: 'recovery.insight.good.title',
      bodyKey: 'recovery.insight.good.body',
      action: 'train_as_planned',
    },
  },
};

const history: GetRecoveryExperienceHistoryResponse = {
  range: { days: 7 },
  items: [],
  trend: { direction: 'insufficient_data', comparedDays: 0 },
};

describe('Recovery screen state mapper', () => {
  it('identifies only transport failures as cache-recoverable', () => {
    expect(
      isRecoverableRecoveryNetworkError(new ApiClientError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'offline',
      })),
    ).toBe(true);
    expect(
      isRecoverableRecoveryNetworkError(new ApiClientError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'unauthorized',
      })),
    ).toBe(false);
  });

  it('keeps current available when history fails', () => {
    const state = buildRecoveryScreenState({
      current: { status: 'success', response: current },
      history: { status: 'error', message: 'history unavailable' },
      isRefreshing: false,
    });

    expect(state.status).toBe('available');
    if (state.status === 'available') {
      expect(state.current.score).toBe(78);
      expect(state.historyStatus).toBe('error');
    }
  });

  it('keeps history loading separate from current loading', () => {
    const state = buildRecoveryScreenState({
      current: { status: 'success', response: current },
      history: { status: 'loading' },
      isRefreshing: false,
    });

    expect(state.status).toBe('available');
    if (state.status === 'available') {
      expect(state.historyStatus).toBe('loading');
    }
  });

  it('preserves current content when a refresh reports a technical failure', () => {
    const state = buildRecoveryScreenState({
      current: {
        status: 'success',
        response: current,
        errorMessage: 'We could not refresh Recovery right now.',
      },
      history: { status: 'success', response: history },
      isRefreshing: false,
    });

    expect(state.status).toBe('available');
    if (state.status === 'available') {
      expect(state.current.score).toBe(78);
      expect(state.currentErrorMessage).toContain('refresh');
    }
  });

  it('uses explicit backend availability without inventing a fallback', () => {
    const unavailable: GetCurrentRecoveryExperienceResponse = {
      availability: 'insufficient_data',
      recovery: null,
    };
    const state = buildRecoveryScreenState({
      current: { status: 'success', response: unavailable },
      history: { status: 'success', response: history },
      isRefreshing: false,
    });

    expect(state.status).toBe('insufficient_data');
  });

  it('maps technical failures to a distinct error state', () => {
    const currentError: RecoveryCurrentResource = {
      status: 'error',
      message: 'We couldn’t load your Recovery right now.',
      isRetrying: false,
    };
    const historyResource: RecoveryHistoryResource = {
      status: 'success',
      response: history,
    };

    expect(
      buildRecoveryScreenState({
        current: currentError,
        history: historyResource,
        isRefreshing: false,
      }).status,
    ).toBe('error');
    expect(mapRecoveryExperienceError(new Error('internal'))).not.toContain('internal');
  });
});
