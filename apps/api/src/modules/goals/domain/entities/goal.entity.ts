import type { GoalContract } from '../goals.contract';
import type { GoalType } from '../goals.types';
import { GoalStatusValueObject } from '../value-objects/goal-status.value-object';

export type GoalProps = {
  id: string;
  userProfileId: string;
  type: GoalType;
  status: GoalStatusValueObject;
  startDate: Date;
  targetDate?: Date;
  achievedAt?: Date;
  targetValue?: number;
  createdAt: Date;
  updatedAt: Date;
};

export class Goal {
  readonly id: string;
  readonly userProfileId: string;
  readonly type: GoalType;
  readonly status: GoalStatusValueObject;
  readonly startDate: Date;
  readonly targetDate?: Date;
  readonly achievedAt?: Date;
  readonly targetValue?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: GoalProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.type = props.type;
    this.status = props.status;
    this.startDate = props.startDate;
    this.targetDate = props.targetDate;
    this.achievedAt = props.achievedAt;
    this.targetValue = props.targetValue;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): GoalContract {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      type: this.type,
      status: this.status.value,
      startDate: this.startDate.toISOString(),
      targetDate: this.targetDate?.toISOString(),
      achievedAt: this.achievedAt?.toISOString(),
      targetValue: this.targetValue,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
