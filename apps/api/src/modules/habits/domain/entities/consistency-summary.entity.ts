import type { ConsistencySummaryContract } from '../habits.contract';
import { ConsistencyTrendValueObject } from '../value-objects/consistency-trend.value-object';
import { HabitRiskLevelValueObject } from '../value-objects/habit-risk-level.value-object';

export type ConsistencySummaryProps = {
  userProfileId: string;
  score: number;
  trend: ConsistencyTrendValueObject;
  currentStreak: number;
  longestStreak: number;
  adherenceRate: number;
  riskLevel: HabitRiskLevelValueObject;
  updatedAt: Date;
  formulaVersion: string;
};

export class ConsistencySummary {
  readonly userProfileId: string;
  readonly score: number;
  readonly trend: ConsistencyTrendValueObject;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly adherenceRate: number;
  readonly riskLevel: HabitRiskLevelValueObject;
  readonly updatedAt: Date;
  readonly formulaVersion: string;

  constructor(props: ConsistencySummaryProps) {
    this.userProfileId = props.userProfileId;
    this.score = props.score;
    this.trend = props.trend;
    this.currentStreak = props.currentStreak;
    this.longestStreak = props.longestStreak;
    this.adherenceRate = props.adherenceRate;
    this.riskLevel = props.riskLevel;
    this.updatedAt = props.updatedAt;
    this.formulaVersion = props.formulaVersion;
  }

  toJSON(): ConsistencySummaryContract {
    return {
      userProfileId: this.userProfileId,
      score: this.score,
      trend: this.trend.value,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      adherenceRate: this.adherenceRate,
      riskLevel: this.riskLevel.value,
      updatedAt: this.updatedAt.toISOString(),
      formulaVersion: this.formulaVersion,
    };
  }
}
