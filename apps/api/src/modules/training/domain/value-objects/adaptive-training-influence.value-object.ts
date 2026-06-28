export type AdaptiveTrainingInfluenceCode =
  | 'HIGH_READINESS'
  | 'LOW_READINESS'
  | 'HIGH_FATIGUE'
  | 'LOW_FATIGUE'
  | 'RECOVERY_TREND_IMPROVING'
  | 'RECOVERY_TREND_DECLINING'
  | 'HIGH_ADHERENCE'
  | 'LOW_ADHERENCE'
  | 'LONG_STREAK'
  | 'MISSED_WORKOUTS'
  | 'GOOD_NUTRITION_SUPPORT'
  | 'POOR_NUTRITION_SUPPORT'
  | 'RECENT_WORKOUT_LOAD_HIGH'
  | 'RECENT_WORKOUT_LOAD_LOW';

export type AdaptiveTrainingInfluenceImpact =
  | 'positive'
  | 'negative'
  | 'neutral';

export type AdaptiveTrainingInfluenceProps = {
  code: AdaptiveTrainingInfluenceCode;
  label: string;
  impact: AdaptiveTrainingInfluenceImpact;
  weight?: number;
  value?: number;
};

export class AdaptiveTrainingInfluence {
  readonly code: AdaptiveTrainingInfluenceCode;
  readonly label: string;
  readonly impact: AdaptiveTrainingInfluenceImpact;
  readonly weight?: number;
  readonly value?: number;

  constructor(props: AdaptiveTrainingInfluenceProps) {
    this.code = props.code;
    this.label = props.label;
    this.impact = props.impact;
    this.weight = props.weight;
    this.value = props.value;
  }

  toJSON(): AdaptiveTrainingInfluenceProps {
    return {
      code: this.code,
      label: this.label,
      impact: this.impact,
      weight: this.weight,
      value: this.value,
    };
  }
}
