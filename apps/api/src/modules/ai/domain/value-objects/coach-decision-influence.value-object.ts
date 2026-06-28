export type CoachDecisionInfluenceCode = string;

export type CoachDecisionInfluenceImpact = 'positive' | 'negative' | 'neutral';

export type CoachDecisionInfluenceSource =
  | 'recovery'
  | 'nutrition'
  | 'training'
  | 'progress'
  | 'memory'
  | 'notification'
  | 'habit'
  | 'personalization';

export type CoachDecisionInfluenceProps = {
  code: CoachDecisionInfluenceCode;
  label: string;
  impact: CoachDecisionInfluenceImpact;
  source: CoachDecisionInfluenceSource;
  weight?: number;
  value?: number;
};

export class CoachDecisionInfluence {
  readonly code: CoachDecisionInfluenceCode;
  readonly label: string;
  readonly impact: CoachDecisionInfluenceImpact;
  readonly source: CoachDecisionInfluenceSource;
  readonly weight?: number;
  readonly value?: number;

  constructor(props: CoachDecisionInfluenceProps) {
    this.code = props.code;
    this.label = props.label;
    this.impact = props.impact;
    this.source = props.source;
    this.weight = props.weight;
    this.value = props.value;
  }

  toJSON(): CoachDecisionInfluenceProps {
    return {
      code: this.code,
      label: this.label,
      impact: this.impact,
      source: this.source,
      weight: this.weight,
      value: this.value,
    };
  }
}
