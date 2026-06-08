import type { HabitSnapshotContract } from '../habits.contract';
import type { HabitSourceContext } from '../habits.types';
import { ConsistencyTrendValueObject } from '../value-objects/consistency-trend.value-object';

export type HabitSnapshotProps = {
  userProfileId: string;
  date: string;
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: ConsistencyTrendValueObject;
  sourceContext: HabitSourceContext;
  formulaVersion: string;
  generatedAt: Date;
};

export class HabitSnapshot {
  readonly userProfileId: string;
  readonly date: string;
  readonly consistencyScore: number;
  readonly streakDays: number;
  readonly adherenceScore: number;
  readonly trend: ConsistencyTrendValueObject;
  readonly sourceContext: HabitSourceContext;
  readonly formulaVersion: string;
  readonly generatedAt: Date;

  constructor(props: HabitSnapshotProps) {
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.consistencyScore = props.consistencyScore;
    this.streakDays = props.streakDays;
    this.adherenceScore = props.adherenceScore;
    this.trend = props.trend;
    this.sourceContext = props.sourceContext;
    this.formulaVersion = props.formulaVersion;
    this.generatedAt = props.generatedAt;
  }

  toJSON(): HabitSnapshotContract {
    return {
      userProfileId: this.userProfileId,
      date: this.date,
      consistencyScore: this.consistencyScore,
      streakDays: this.streakDays,
      adherenceScore: this.adherenceScore,
      trend: this.trend.value,
      sourceContext: this.sourceContext,
      formulaVersion: this.formulaVersion,
      generatedAt: this.generatedAt.toISOString(),
    };
  }
}
