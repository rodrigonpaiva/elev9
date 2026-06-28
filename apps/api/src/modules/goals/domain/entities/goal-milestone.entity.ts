import type { GoalMilestoneContract } from '../goals.contract';
import { GoalMilestoneTypeValueObject } from '../value-objects/goal-milestone-type.value-object';

export type GoalMilestoneProps = {
  goalId: string;
  type: GoalMilestoneTypeValueObject;
  title: string;
  targetValue: number;
  achieved: boolean;
  achievedAt?: Date;
};

export class GoalMilestone {
  readonly goalId: string;
  readonly type: GoalMilestoneTypeValueObject;
  readonly title: string;
  readonly targetValue: number;
  readonly achieved: boolean;
  readonly achievedAt?: Date;

  constructor(props: GoalMilestoneProps) {
    this.goalId = props.goalId;
    this.type = props.type;
    this.title = props.title;
    this.targetValue = props.targetValue;
    this.achieved = props.achieved;
    this.achievedAt = props.achievedAt;
  }

  toJSON(): GoalMilestoneContract {
    return {
      goalId: this.goalId,
      type: this.type.value,
      title: this.title,
      targetValue: this.targetValue,
      achieved: this.achieved,
      achievedAt: this.achievedAt?.toISOString(),
    };
  }
}
