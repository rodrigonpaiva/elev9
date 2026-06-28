import type { GoalTrend } from '../goals.types';

export type GoalTrendProps = {
  value: GoalTrend;
};

export class GoalTrendValueObject {
  readonly value: GoalTrend;

  constructor(value: GoalTrend) {
    this.value = value;
  }

  toJSON(): GoalTrendProps {
    return {
      value: this.value,
    };
  }
}
