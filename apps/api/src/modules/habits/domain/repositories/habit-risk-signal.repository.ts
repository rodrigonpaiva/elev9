import { HabitRiskSignal } from '../entities/habit-risk-signal.entity';
import type { HabitRiskLevel, RiskSignalType } from '../habits.types';

export interface HabitRiskSignalQueryOptions {
  limit?: number;
}

export interface CreateHabitRiskSignalRepositoryInput {
  userProfileId: string;
  type: RiskSignalType;
  level: HabitRiskLevel;
  title: string;
  description: string;
  generatedAt: Date;
  formulaVersion: string;
}

export interface HabitRiskSignalRepository {
  findManyByUserProfileId(
    userProfileId: string,
    options?: HabitRiskSignalQueryOptions,
  ): Promise<HabitRiskSignal[]>;
  createMany(input: HabitRiskSignal[]): Promise<HabitRiskSignal[]>;
  deleteByUserProfileId(userProfileId: string): Promise<void>;
  findRecentByUserProfileId(
    userProfileId: string,
    options?: HabitRiskSignalQueryOptions,
  ): Promise<HabitRiskSignal[]>;
}

export const HABIT_RISK_SIGNAL_REPOSITORY = Symbol(
  'HABIT_RISK_SIGNAL_REPOSITORY',
);
