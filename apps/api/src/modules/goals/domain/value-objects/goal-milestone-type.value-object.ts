import type { GoalMilestoneType } from '../goals.types';

export type GoalMilestoneTypeProps = {
  value: GoalMilestoneType;
};

export class GoalMilestoneTypeValueObject {
  readonly value: GoalMilestoneType;

  constructor(value: GoalMilestoneType) {
    this.value = value;
  }

  toJSON(): GoalMilestoneTypeProps {
    return {
      value: this.value,
    };
  }
}
