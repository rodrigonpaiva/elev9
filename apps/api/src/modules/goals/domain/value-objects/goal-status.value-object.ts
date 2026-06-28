import type { GoalStatus } from '../goals.types';

export type GoalStatusProps = {
  value: GoalStatus;
};

export class GoalStatusValueObject {
  readonly value: GoalStatus;

  constructor(value: GoalStatus) {
    this.value = value;
  }

  toJSON(): GoalStatusProps {
    return {
      value: this.value,
    };
  }
}
