import type {
  GoalForecastConfidence,
  GoalMilestoneType,
  GoalStatus,
  GoalTrend,
  GoalType,
} from './goals.types';

export interface GoalContract {
  id: string;
  userProfileId: string;
  type: GoalType;
  status: GoalStatus;
  startDate: string;
  targetDate?: string;
  achievedAt?: string;
  targetValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgressSnapshotContract {
  goalId: string;
  userProfileId: string;
  date: string;
  progressPercentage: number;
  currentValue: number;
  targetValue: number;
  trend: GoalTrend;
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
}

export interface GoalForecastContract {
  goalId: string;
  userProfileId: string;
  predictedCompletionDate?: string;
  confidence: GoalForecastConfidence;
  estimatedDaysRemaining: number;
  generatedAt: string;
  formulaVersion: string;
}

export interface GoalMilestoneContract {
  goalId: string;
  type: GoalMilestoneType;
  title: string;
  targetValue: number;
  achieved: boolean;
  achievedAt?: string;
}

export interface GoalAchievementContract {
  goalId: string;
  achievedAt: string;
  completionPercentage: number;
  notes?: string;
}
