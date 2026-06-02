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

export type RecoveryInfluenceImpact = 'positive' | 'negative' | 'neutral';

export type RecoveryInfluenceProps = {
  code: RecoveryInfluenceCode;
  label: string;
  impact: RecoveryInfluenceImpact;
  weight?: number;
  value?: number;
};

export class RecoveryInfluence {
  readonly code: RecoveryInfluenceCode;
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
