import { CoachDecision } from '../entities/coach-decision.entity';
import {
  CoachDecisionInfluenceProps,
} from '../value-objects/coach-decision-influence.value-object';
import {
  CoachDecisionPriority,
} from '../value-objects/coach-decision-priority.value-object';

export interface CoachDecisionQueryOptions {
  limit?: number;
}

export interface UpsertCoachDecisionRepositoryInput {
  userProfileId: string;
  date: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceProps[];
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
  generatedBy: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
}

export interface CoachDecisionRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<CoachDecision | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<CoachDecision | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: CoachDecisionQueryOptions,
  ): Promise<CoachDecision[]>;
  findRecentByUserProfileId(
    userProfileId: string,
    options?: CoachDecisionQueryOptions,
  ): Promise<CoachDecision[]>;
  findById(id: string): Promise<CoachDecision | null>;
  upsertDailyDecision(
    input: UpsertCoachDecisionRepositoryInput,
  ): Promise<CoachDecision>;
}

export const COACH_DECISION_REPOSITORY = Symbol(
  'COACH_DECISION_REPOSITORY',
);
