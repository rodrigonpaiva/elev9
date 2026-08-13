export type RecoveryReadAvailability =
  | 'available'
  | 'not_available'
  | 'insufficient_data'
  | 'processing_failed';

export type RecoveryReadFreshness = 'current' | 'stale' | 'legacy' | 'unknown';

export type RecoveryReadCategory = 'low' | 'moderate' | 'good' | 'high';

export type RecoveryFactorKey = 'energy' | 'sleep' | 'muscle_soreness';
export type RecoveryFactorImpact =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'unavailable';

export type RecoveryInsightTone =
  | 'supportive'
  | 'caution'
  | 'positive'
  | 'neutral';

export type RecoveryInsightAction =
  | 'train_as_planned'
  | 'reduce_intensity'
  | 'prioritize_recovery'
  | 'complete_check_in'
  | 'try_again_later';

export type RecoveryTrendDirection =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'insufficient_data';

export type RecoveryFactorReadModel = {
  key: RecoveryFactorKey;
  impact: RecoveryFactorImpact;
  labelKey: string;
  explanationKey: string;
};

export type RecoveryInsightReadModel = {
  tone: RecoveryInsightTone;
  titleKey: string;
  bodyKey: string;
  action: RecoveryInsightAction;
};

export type RecoveryCurrentReadModel = {
  availability: RecoveryReadAvailability;
  recovery: {
    score: number;
    fatigueScore: number;
    category: RecoveryReadCategory;
    freshness: RecoveryReadFreshness;
    lastUpdatedAt: string;
    trend: RecoveryTrendDirection;
    breakdown: RecoveryFactorReadModel[];
    insight: RecoveryInsightReadModel;
  } | null;
};

export type RecoveryHistoryItemReadModel = {
  localDate: string;
  score: number;
  category: RecoveryReadCategory;
  availability: RecoveryReadAvailability;
  freshness: RecoveryReadFreshness;
};

export type RecoveryHistoryReadModel = {
  range: { days: number };
  items: RecoveryHistoryItemReadModel[];
  trend: {
    direction: RecoveryTrendDirection;
    comparedDays: number;
  };
};
