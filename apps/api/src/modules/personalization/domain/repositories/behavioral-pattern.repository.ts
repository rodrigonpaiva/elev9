import { BehavioralPattern } from '../entities/behavioral-pattern.entity';
import type {
  BehavioralPatternType,
  ResponsivenessLevel,
} from '../personalization.types';

export interface BehavioralPatternQueryOptions {
  limit?: number;
}

export interface UpsertBehavioralPatternRepositoryInput {
  userProfileId: string;
  type: BehavioralPatternType;
  confidence: ResponsivenessLevel;
  evidenceCount: number;
  lastObservedAt: Date;
  formulaVersion: string;
}

export interface BehavioralPatternRepository {
  findManyByUserProfileId(
    userProfileId: string,
    options?: BehavioralPatternQueryOptions,
  ): Promise<BehavioralPattern[]>;
  findByUserProfileIdAndType(
    userProfileId: string,
    type: BehavioralPatternType,
  ): Promise<BehavioralPattern | null>;
  upsertPattern(
    input: UpsertBehavioralPatternRepositoryInput,
  ): Promise<BehavioralPattern>;
  replaceManyByUserProfileId(
    userProfileId: string,
    patterns: UpsertBehavioralPatternRepositoryInput[],
  ): Promise<BehavioralPattern[]>;
}

export const BEHAVIORAL_PATTERN_REPOSITORY = Symbol(
  'BEHAVIORAL_PATTERN_REPOSITORY',
);
