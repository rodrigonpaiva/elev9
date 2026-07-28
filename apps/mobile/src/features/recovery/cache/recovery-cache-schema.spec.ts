import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';

import {
  buildRecoveryCacheRecord,
  getRecoveryCacheAge,
  parseRecoveryCacheRecord,
  RECOVERY_CACHE_HARD_TTL_MS,
  RECOVERY_CACHE_SOFT_TTL_MS,
} from './recovery-cache-schema';

const ownerKey = 'session-owner-a1234567';
const savedAt = '2026-07-28T10:00:00.000Z';

const current: GetCurrentRecoveryExperienceResponse = {
  availability: 'available',
  recovery: {
    score: 78,
    fatigueScore: 22,
    category: 'good',
    freshness: 'current',
    lastUpdatedAt: savedAt,
    trend: 'stable',
    breakdown: [
      {
        key: 'energy',
        impact: 'positive',
        labelKey: 'recovery.factor.energy.label',
        explanationKey: 'recovery.factor.energy.positive',
      },
    ],
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
  items: [
    {
      localDate: '2026-07-28',
      score: 78,
      category: 'good',
      availability: 'available',
      freshness: 'current',
    },
  ],
  trend: { direction: 'stable', comparedDays: 1 },
};

describe('Recovery cache schema', () => {
  it('allowlists the public current and history read models', () => {
    const record = buildRecoveryCacheRecord({
      ownerKey,
      current,
      history,
      savedAt,
    });

    expect(record).toEqual({
      version: 1,
      ownerKey,
      savedAt,
      current,
      history,
    });
  });

  it('supports independently cached history without a current response', () => {
    const record = buildRecoveryCacheRecord({
      ownerKey,
      current: null,
      history,
      savedAt,
    });

    expect(record?.current).toBeNull();
    expect(record?.history).toEqual(history);
  });

  it('rejects forbidden fields and unknown public fields', () => {
    expect(
      parseRecoveryCacheRecord({
        version: 1,
        ownerKey,
        savedAt,
        current: { ...current, userProfileId: 'private' },
        history: null,
      }),
    ).toBeNull();
  });

  it('rejects unknown versions and malformed JSON shapes', () => {
    expect(parseRecoveryCacheRecord({ version: 2 })).toBeNull();
    expect(parseRecoveryCacheRecord('not a record')).toBeNull();
  });

  it('classifies cache age independently from Recovery freshness', () => {
    const now = Date.parse(savedAt) + RECOVERY_CACHE_SOFT_TTL_MS;
    expect(getRecoveryCacheAge(savedAt, now)).toBe('recent');
    expect(getRecoveryCacheAge(savedAt, now + 1)).toBe('old');
    expect(
      getRecoveryCacheAge(savedAt, Date.parse(savedAt) + RECOVERY_CACHE_HARD_TTL_MS + 1),
    ).toBe('expired');
    expect(getRecoveryCacheAge('not-a-date', now)).toBe('expired');
  });
});
