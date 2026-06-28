export type CoachDecisionPriority =
  | 'recovery'
  | 'nutrition'
  | 'training'
  | 'consistency'
  | 'motivation';

export type CoachDecisionPriorityProps = {
  value: CoachDecisionPriority;
};

export class CoachDecisionPriorityValueObject {
  readonly value: CoachDecisionPriority;

  constructor(value: CoachDecisionPriority) {
    this.value = value;
  }

  toJSON(): CoachDecisionPriorityProps {
    return {
      value: this.value,
    };
  }
}
