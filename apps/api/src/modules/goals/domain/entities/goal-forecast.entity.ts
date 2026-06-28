import type { GoalForecastContract } from '../goals.contract';
import { GoalForecastConfidenceValueObject } from '../value-objects/goal-forecast-confidence.value-object';

export type GoalForecastProps = {
  goalId: string;
  userProfileId: string;
  predictedCompletionDate?: Date;
  confidence: GoalForecastConfidenceValueObject;
  estimatedDaysRemaining: number;
  generatedAt: Date;
  formulaVersion: string;
};

export class GoalForecast {
  readonly goalId: string;
  readonly userProfileId: string;
  readonly predictedCompletionDate?: Date;
  readonly confidence: GoalForecastConfidenceValueObject;
  readonly estimatedDaysRemaining: number;
  readonly generatedAt: Date;
  readonly formulaVersion: string;

  constructor(props: GoalForecastProps) {
    this.goalId = props.goalId;
    this.userProfileId = props.userProfileId;
    this.predictedCompletionDate = props.predictedCompletionDate;
    this.confidence = props.confidence;
    this.estimatedDaysRemaining = props.estimatedDaysRemaining;
    this.generatedAt = props.generatedAt;
    this.formulaVersion = props.formulaVersion;
  }

  toJSON(): GoalForecastContract {
    return {
      goalId: this.goalId,
      userProfileId: this.userProfileId,
      predictedCompletionDate: this.predictedCompletionDate?.toISOString(),
      confidence: this.confidence.value,
      estimatedDaysRemaining: this.estimatedDaysRemaining,
      generatedAt: this.generatedAt.toISOString(),
      formulaVersion: this.formulaVersion,
    };
  }
}
