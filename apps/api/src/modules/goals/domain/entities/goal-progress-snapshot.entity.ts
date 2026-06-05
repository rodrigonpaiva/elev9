import type { GoalProgressSnapshotContract } from '../goals.contract';
import type { GoalSourceContext } from '../../../../shared/source-context';
import { GoalTrendValueObject } from '../value-objects/goal-trend.value-object';

export type GoalProgressSnapshotProps = {
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: GoalTrendValueObject;
  sourceContext: GoalSourceContext;
  formulaVersion: string;
};

export class GoalProgressSnapshot {
  readonly goalId: string;
  readonly userProfileId: string;
  readonly date: string;
  readonly progressPercentage: number;
  readonly currentValue: number;
  readonly targetValue: number;
  readonly trend: GoalTrendValueObject;
  readonly sourceContext: GoalSourceContext;
  readonly formulaVersion: string;

  constructor(props: GoalProgressSnapshotProps) {
    this.goalId = props.goalId;
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.progressPercentage = props.progressPercentage;
    this.currentValue = props.currentValue;
    this.targetValue = props.targetValue;
    this.trend = props.trend;
    this.sourceContext = props.sourceContext;
    this.formulaVersion = props.formulaVersion;
  }

  toJSON(): GoalProgressSnapshotContract {
    return {
      goalId: this.goalId,
      userProfileId: this.userProfileId,
      date: this.date,
      progressPercentage: this.progressPercentage,
      currentValue: this.currentValue,
      targetValue: this.targetValue,
      trend: this.trend.value,
      sourceContext: this.sourceContext,
      formulaVersion: this.formulaVersion,
    };
  }
}
