import type { GoalForecastConfidence } from '../goals.types';

export type GoalForecastConfidenceProps = {
  value: GoalForecastConfidence;
};

export class GoalForecastConfidenceValueObject {
  readonly value: GoalForecastConfidence;

  constructor(value: GoalForecastConfidence) {
    this.value = value;
  }

  toJSON(): GoalForecastConfidenceProps {
    return {
      value: this.value,
    };
  }
}
