import type {
  GetCurrentRecoveryExperienceResponse,
  RecoveryExperienceHistoryItem,
} from '@elev9/types';

import type {
  RecoveryScreenAvailableState,
  RecoveryScreenState,
} from '../models/recovery-screen-state';

export const recoveryHistoryFixture: RecoveryExperienceHistoryItem[] = [
  {
    localDate: '2026-07-22',
    score: 64,
    category: 'moderate',
    availability: 'available',
    freshness: 'current',
  },
  {
    localDate: '2026-07-23',
    score: 70,
    category: 'good',
    availability: 'available',
    freshness: 'current',
  },
  {
    localDate: '2026-07-24',
    score: 74,
    category: 'good',
    availability: 'available',
    freshness: 'current',
  },
  {
    localDate: '2026-07-25',
    score: 78,
    category: 'good',
    availability: 'available',
    freshness: 'current',
  },
];

export const availableRecoveryFixture = {
  availability: 'available',
  recovery: {
    score: 78,
    fatigueScore: 32,
    category: 'good',
    freshness: 'current',
    lastUpdatedAt: '2026-07-28T10:15:00.000Z',
    trend: 'improving',
    breakdown: [
      {
        key: 'energy',
        impact: 'positive',
        labelKey: 'recovery.factors.energy.label',
        explanationKey: 'recovery.factors.energy.positive',
      },
      {
        key: 'sleep',
        impact: 'neutral',
        labelKey: 'recovery.factors.sleep.label',
        explanationKey: 'recovery.factors.sleep.neutral',
      },
      {
        key: 'muscle_soreness',
        impact: 'negative',
        labelKey: 'recovery.factors.soreness.label',
        explanationKey: 'recovery.factors.soreness.negative',
      },
    ],
    insight: {
      tone: 'positive',
      titleKey: 'recovery.insight.good.title',
      bodyKey: 'recovery.insight.good.body',
      action: 'train_as_planned',
    },
  },
} satisfies GetCurrentRecoveryExperienceResponse;

export const availableRecoveryScreenFixture: RecoveryScreenAvailableState = {
  status: 'available',
  current: availableRecoveryFixture.recovery!,
  history: recoveryHistoryFixture,
  trend: { direction: 'improving', comparedDays: 4 },
  selectedRange: 7,
  isRefreshing: false,
  historyStatus: 'available',
};

export const staleRecoveryScreenFixture: RecoveryScreenAvailableState = {
  ...availableRecoveryScreenFixture,
  current: { ...availableRecoveryScreenFixture.current, freshness: 'stale' },
};

export const legacyRecoveryScreenFixture: RecoveryScreenAvailableState = {
  ...availableRecoveryScreenFixture,
  current: { ...availableRecoveryScreenFixture.current, freshness: 'legacy' },
};

export const unknownFreshnessRecoveryScreenFixture: RecoveryScreenAvailableState =
  {
    ...availableRecoveryScreenFixture,
    current: {
      ...availableRecoveryScreenFixture.current,
      freshness: 'unknown',
    },
  };

export const insufficientDataRecoveryScreenFixture: RecoveryScreenState = {
  status: 'insufficient_data',
  isRefreshing: false,
};

export const notAvailableRecoveryScreenFixture: RecoveryScreenState = {
  status: 'not_available',
  isRefreshing: false,
};

export const processingFailedRecoveryScreenFixture: RecoveryScreenState = {
  status: 'processing_failed',
  isRefreshing: false,
};

export const errorRecoveryScreenFixture: RecoveryScreenState = {
  status: 'error',
  isRetrying: false,
  message: 'We could not load Recovery. Please try again.',
};
