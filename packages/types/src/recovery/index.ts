import type { IsoDateTime, LocalDate } from '../progress';

export type RecoveryTrend = 'improving' | 'stable' | 'declining';

export type RecommendedIntensity = 'recovery' | 'light' | 'moderate' | 'hard';

export type RecoveryInfluenceCode =
  | 'LOW_SLEEP'
  | 'LOW_ENERGY'
  | 'HIGH_MUSCLE_SORENESS'
  | 'HIGH_ADHERENCE'
  | 'LOW_ADHERENCE'
  | 'HIGH_WORKOUT_LOAD'
  | 'RECENT_WORKOUT_COMPLETION'
  | 'LONG_STREAK'
  | 'MISSED_WORKOUTS';

export type RecoveryInfluence = {
  code: RecoveryInfluenceCode;
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight?: number;
  value?: number;
};

export type RecoverySourceContext = {
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  previousReadinessScores?: number[];
  formulaVersion?: string;
  generatedAt?: string;
};

export type RecoverySnapshot = {
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoveryTrend;
  recommendedIntensity: RecommendedIntensity;
  influences: RecoveryInfluence[];
  formulaVersion: string;
  sourceContext: RecoverySourceContext;
  createdAt: string;
};

export type BuildRecoverySnapshotInput = {
  authUserId: string;
  date?: string;
  sleepQuality?: number;
  energyLevel?: number;
  muscleSoreness?: number;
  adherenceScore?: number;
  recentWorkoutLoad?: number;
  currentStreak?: number;
  missedWorkouts?: number;
  previousReadinessScores?: number[];
  sourceContext?: RecoverySourceContext;
};

export type BuildRecoverySnapshotOutput = {
  recoverySnapshot: RecoverySnapshot;
};

export type GetTodayRecoveryResponse = {
  recoverySnapshot: RecoverySnapshot;
};

export type GetCurrentRecoveryResponse = {
  recoverySnapshot: RecoverySnapshot;
};

export type GetRecoveryHistoryResponse = {
  recoverySnapshots: RecoverySnapshot[];
};

/** Public product availability returned by the Recovery Experience endpoints. */
export type RecoveryExperienceAvailability =
  | 'available'
  | 'not_available'
  | 'insufficient_data'
  | 'processing_failed';

/** Freshness is intentionally richer than a boolean so legacy data is not hidden. */
export type RecoveryExperienceFreshness =
  | 'current'
  | 'stale'
  | 'legacy'
  | 'unknown';

export type RecoveryExperienceCategory = 'low' | 'moderate' | 'good' | 'high';

export type RecoveryExperienceFactorKey =
  | 'energy'
  | 'sleep'
  | 'muscle_soreness';

export type RecoveryExperienceFactorImpact =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'unavailable';

export type RecoveryExperienceInsightTone =
  | 'supportive'
  | 'caution'
  | 'positive'
  | 'neutral';

export type RecoveryExperienceInsightAction =
  | 'train_as_planned'
  | 'reduce_intensity'
  | 'prioritize_recovery'
  | 'complete_check_in'
  | 'try_again_later';

export type RecoveryExperienceTrendDirection =
  | 'improving'
  | 'stable'
  | 'declining'
  | 'insufficient_data';

export type RecoveryExperienceFactor = {
  key: RecoveryExperienceFactorKey;
  impact: RecoveryExperienceFactorImpact;
  labelKey: string;
  explanationKey: string;
};

export type RecoveryExperienceInsight = {
  tone: RecoveryExperienceInsightTone;
  titleKey: string;
  bodyKey: string;
  action: RecoveryExperienceInsightAction;
};

export type RecoveryExperienceCurrent = {
  score: number;
  fatigueScore: number;
  category: RecoveryExperienceCategory;
  freshness: RecoveryExperienceFreshness;
  lastUpdatedAt: IsoDateTime;
  trend: RecoveryExperienceTrendDirection;
  breakdown: RecoveryExperienceFactor[];
  insight: RecoveryExperienceInsight;
};

export type GetCurrentRecoveryExperienceResponse = {
  availability: RecoveryExperienceAvailability;
  recovery: RecoveryExperienceCurrent | null;
};

export type GetRecoveryExperienceHistoryQuery = {
  days?: number;
};

export type RecoveryExperienceHistoryItem = {
  localDate: LocalDate;
  score: number;
  category: RecoveryExperienceCategory;
  availability: RecoveryExperienceAvailability;
  freshness: RecoveryExperienceFreshness;
};

export type RecoveryExperienceTrend = {
  direction: RecoveryExperienceTrendDirection;
  comparedDays: number;
};

export type GetRecoveryExperienceHistoryResponse = {
  range: {
    days: number;
  };
  items: RecoveryExperienceHistoryItem[];
  trend: RecoveryExperienceTrend;
};
