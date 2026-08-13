import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
  RecoveryExperienceFactor,
} from './index';

const availableCurrent = {
  availability: 'available',
  recovery: {
    score: 78,
    fatigueScore: 32,
    category: 'good',
    freshness: 'current',
    lastUpdatedAt: '2026-07-28T10:15:00.000Z',
    trend: 'stable',
    breakdown: [
      {
        key: 'energy',
        impact: 'positive',
        labelKey: 'recovery.factors.energy.label',
        explanationKey: 'recovery.factors.energy.explanation',
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

const unavailableCurrent = {
  availability: 'insufficient_data',
  recovery: null,
} satisfies GetCurrentRecoveryExperienceResponse;

const history = {
  range: { days: 7 },
  items: [
    {
      localDate: '2026-07-28',
      score: 78,
      category: 'good',
      availability: 'available',
      freshness: 'current',
    },
  ],
  trend: {
    direction: 'insufficient_data',
    comparedDays: 1,
  },
} satisfies GetRecoveryExperienceHistoryResponse;

// These negative assertions keep internal health fields out of public contracts.
const invalidMotivationFactor: RecoveryExperienceFactor = {
  // @ts-expect-error motivation is Coach-only context, not a Recovery factor key.
  key: 'motivation',
  impact: 'neutral',
  labelKey: 'invalid',
  explanationKey: 'invalid',
};
const invalidSourceContextResponse: GetCurrentRecoveryExperienceResponse = {
  ...availableCurrent,
  // @ts-expect-error public Recovery contracts must not expose sourceContext.
  sourceContext: {},
};

void unavailableCurrent;
void history;
void invalidMotivationFactor;
void invalidSourceContextResponse;
