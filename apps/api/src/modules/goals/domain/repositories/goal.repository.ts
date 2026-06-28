import { Goal } from '../entities/goal.entity';
import { GoalStatus, GoalType } from '../goals.types';
import { GoalStatusValueObject } from '../value-objects/goal-status.value-object';

export interface GoalQueryOptions {
  limit?: number;
}

export interface CreateGoalRepositoryInput {
  userProfileId: string;
  type: GoalType;
  status: GoalStatus;
  startDate: string;
  targetDate?: string;
  achievedAt?: string;
  targetValue?: number;
}

export interface ReplaceActiveGoalRepositoryInput {
  type: GoalType;
  startDate: string;
  targetDate?: string;
  targetValue?: number;
}

export interface GoalRepository {
  findActiveByUserProfileId(userProfileId: string): Promise<Goal | null>;
  findById(id: string): Promise<Goal | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: GoalQueryOptions,
  ): Promise<Goal[]>;
  create(input: CreateGoalRepositoryInput): Promise<Goal>;
  replaceActiveGoal(
    userProfileId: string,
    input: ReplaceActiveGoalRepositoryInput,
  ): Promise<Goal>;
  markAchieved(goalId: string, achievedAt: string): Promise<Goal | null>;
  markAbandoned(goalId: string): Promise<Goal | null>;
}

export const GOAL_REPOSITORY = Symbol('GOAL_REPOSITORY');

export function createGoalStatusValueObject(
  status: GoalStatus,
): GoalStatusValueObject {
  return new GoalStatusValueObject(status);
}
