export type RecoveryInfluenceImpact = 'positive' | 'negative' | 'neutral';
export type RecoveryTrend = 'improving' | 'stable' | 'declining';
export type RecommendedIntensity = 'recovery' | 'light' | 'moderate' | 'hard';

export type RecoveryInfluenceProps = {
  code:
    | 'LOW_SLEEP'
    | 'LOW_ENERGY'
    | 'HIGH_MUSCLE_SORENESS'
    | 'HIGH_ADHERENCE'
    | 'LOW_ADHERENCE'
    | 'HIGH_WORKOUT_LOAD'
    | 'RECENT_WORKOUT_COMPLETION'
    | 'LONG_STREAK'
    | 'MISSED_WORKOUTS';
  label: string;
  impact: RecoveryInfluenceImpact;
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
  recentCheckInsCount?: number;
  recentWorkoutLogsCount?: number;
  trainingPlanId?: string;
  previousReadinessScores?: number[];
  formulaVersion?: string;
  generatedAt?: string;
};

export type RecoverySnapshotProps = {
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoveryTrend;
  recommendedIntensity: RecommendedIntensity;
  influences: RecoveryInfluence[];
  formulaVersion: string;
  sourceContext: RecoverySourceContext;
  createdAt: Date;
};

export class RecoveryInfluence {
  readonly code: RecoveryInfluenceProps['code'];
  readonly label: string;
  readonly impact: RecoveryInfluenceImpact;
  readonly weight?: number;
  readonly value?: number;

  constructor(props: RecoveryInfluenceProps) {
    this.code = props.code;
    this.label = props.label;
    this.impact = props.impact;
    this.weight = props.weight;
    this.value = props.value;
  }

  toJSON(): RecoveryInfluenceProps {
    return {
      code: this.code,
      label: this.label,
      impact: this.impact,
      weight: this.weight,
      value: this.value,
    };
  }
}

export class RecoverySnapshot {
  readonly userProfileId: string;
  readonly date: string;
  readonly readinessScore: number;
  readonly fatigueScore: number;
  readonly recoveryTrend: RecoveryTrend;
  readonly recommendedIntensity: RecommendedIntensity;
  readonly influences: RecoveryInfluence[];
  readonly formulaVersion: string;
  readonly sourceContext: RecoverySourceContext;
  readonly createdAt: Date;

  constructor(props: RecoverySnapshotProps) {
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.readinessScore = props.readinessScore;
    this.fatigueScore = props.fatigueScore;
    this.recoveryTrend = props.recoveryTrend;
    this.recommendedIntensity = props.recommendedIntensity;
    this.influences = props.influences;
    this.formulaVersion = props.formulaVersion;
    this.sourceContext = props.sourceContext;
    this.createdAt = props.createdAt;
  }

  toJSON(): RecoverySnapshotProps {
    return {
      userProfileId: this.userProfileId,
      date: this.date,
      readinessScore: this.readinessScore,
      fatigueScore: this.fatigueScore,
      recoveryTrend: this.recoveryTrend,
      recommendedIntensity: this.recommendedIntensity,
      influences: this.influences,
      formulaVersion: this.formulaVersion,
      sourceContext: this.sourceContext,
      createdAt: this.createdAt,
    };
  }
}
