import type {
  RecoveryExperienceCurrent,
  RecoveryExperienceFactor,
  RecoveryExperienceTrend,
} from '@elev9/types';

import {
  categoryLabel,
  factorExplanation,
  factorLabel,
  impactLabel,
  trendLabel,
} from './recovery-copy';

export function recoveryScoreAccessibilityLabel(
  current: RecoveryExperienceCurrent,
): string {
  return `Recovery score ${current.score}. Category ${categoryLabel(current.category)}.`;
}

export function recoveryFactorAccessibilityLabel(
  factor: RecoveryExperienceFactor,
): string {
  return `${factorLabel(factor)}. ${impactLabel(factor.impact)}. ${factorExplanation(factor)}`;
}

export function recoveryTrendAccessibilityLabel(
  trend: RecoveryExperienceTrend,
  availablePointCount: number,
): string {
  return `Seven-day Recovery trend. ${trendLabel(trend.direction)}. ${availablePointCount} data point${availablePointCount === 1 ? '' : 's'} available.`;
}
