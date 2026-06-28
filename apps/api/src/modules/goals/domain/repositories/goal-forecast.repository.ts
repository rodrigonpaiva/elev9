import { GoalForecast } from '../entities/goal-forecast.entity';
import { GoalForecastConfidence } from '../goals.types';

export interface UpsertGoalForecastRepositoryInput {
  goalId: string;
  userProfileId: string;
  predictedCompletionDate?: string;
  confidence: GoalForecastConfidence;
  estimatedDaysRemaining: number;
  generatedAt: string;
  formulaVersion: string;
}

export interface GoalForecastRepository {
  findByGoalId(goalId: string): Promise<GoalForecast | null>;
  upsertForecast(
    input: UpsertGoalForecastRepositoryInput,
  ): Promise<GoalForecast>;
}

export const GOAL_FORECAST_REPOSITORY = Symbol('GOAL_FORECAST_REPOSITORY');
