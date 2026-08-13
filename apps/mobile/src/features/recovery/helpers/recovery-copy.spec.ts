import type { RecoveryExperienceFactor } from '@elev9/types';

import {
  categoryLabel,
  factorExplanation,
  factorLabel,
  freshnessLabel,
  impactLabel,
  trendLabel,
} from './recovery-copy';

describe('recovery presentation copy', () => {
  it('presents backend categories without calculating them', () => {
    expect(categoryLabel('low')).toBe('Low');
    expect(categoryLabel('moderate')).toBe('Moderate');
    expect(categoryLabel('good')).toBe('Good');
    expect(categoryLabel('high')).toBe('High');
  });

  it('keeps freshness and trend semantics explicit', () => {
    expect(freshnessLabel('legacy')).toContain('before');
    expect(impactLabel('unavailable')).toBe('Not available');
    expect(trendLabel('insufficient_data')).toBe('Not enough data yet');
  });

  it('presents only public Recovery factors', () => {
    const factor: RecoveryExperienceFactor = {
      key: 'muscle_soreness',
      impact: 'negative',
      labelKey: 'recovery.factors.soreness.label',
      explanationKey: 'recovery.factors.soreness.negative',
    };

    expect(factorLabel(factor)).toBe('Muscle soreness');
    expect(factorExplanation(factor)).toContain('limited');
  });
});
