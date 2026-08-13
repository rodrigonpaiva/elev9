import type {
  RecoveryExperienceCategory,
  RecoveryExperienceFactor,
  RecoveryExperienceFactorImpact,
  RecoveryExperienceFreshness,
  RecoveryExperienceInsightAction,
  RecoveryExperienceInsightTone,
  RecoveryExperienceTrendDirection,
} from '@elev9/types';

const categoryLabels: Record<RecoveryExperienceCategory, string> = {
  low: 'Low',
  moderate: 'Moderate',
  good: 'Good',
  high: 'High',
};

const freshnessLabels: Record<RecoveryExperienceFreshness, string> = {
  current: 'Updated today',
  stale: 'Showing your most recent available result',
  legacy: 'Created before the latest Recovery updates',
  unknown: 'Last refresh could not be confirmed',
};

const impactLabels: Record<RecoveryExperienceFactorImpact, string> = {
  positive: 'Supporting recovery',
  neutral: 'Neutral today',
  negative: 'Limiting recovery',
  unavailable: 'Not available',
};

const trendLabels: Record<RecoveryExperienceTrendDirection, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Trending lower',
  insufficient_data: 'Not enough data yet',
};

const actionLabels: Record<RecoveryExperienceInsightAction, string> = {
  train_as_planned: 'Train as planned',
  reduce_intensity: 'Reduce intensity',
  prioritize_recovery: 'Prioritize recovery',
  complete_check_in: 'Complete check-in',
  try_again_later: 'Try again later',
};

const factorLabels = {
  energy: 'Energy',
  sleep: 'Sleep',
  muscle_soreness: 'Muscle soreness',
} as const;

export function categoryLabel(category: RecoveryExperienceCategory): string {
  return categoryLabels[category];
}

export function freshnessLabel(freshness: RecoveryExperienceFreshness): string {
  return freshnessLabels[freshness];
}

export function impactLabel(impact: RecoveryExperienceFactorImpact): string {
  return impactLabels[impact];
}

export function trendLabel(
  direction: RecoveryExperienceTrendDirection,
): string {
  return trendLabels[direction];
}

export function actionLabel(action: RecoveryExperienceInsightAction): string {
  return actionLabels[action];
}

export function factorLabel(factor: RecoveryExperienceFactor): string {
  return factorLabels[factor.key];
}

export function factorExplanation(factor: RecoveryExperienceFactor): string {
  const key = factor.explanationKey.toLowerCase();
  const subject = factorLabels[factor.key].toLowerCase();

  if (key.includes('positive')) {
    return `Your ${subject} supported today’s result.`;
  }

  if (key.includes('negative')) {
    return `Your ${subject} limited today’s result.`;
  }

  if (key.includes('unavailable')) {
    return `Your ${subject} was not available for this result.`;
  }

  return `Your ${subject} had a neutral influence today.`;
}

export function insightToneLabel(tone: RecoveryExperienceInsightTone): string {
  return tone === 'caution'
    ? 'A flexible approach may help today'
    : tone === 'positive'
      ? 'Your recovery supports today’s plan'
      : tone === 'supportive'
        ? 'A supportive plan for today'
        : 'Today’s recovery guidance';
}
