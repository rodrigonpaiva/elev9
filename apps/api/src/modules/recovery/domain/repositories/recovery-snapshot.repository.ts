import {
  RecoveryInfluenceProps,
  RecoveryTrend,
  RecommendedIntensity,
  RecoverySnapshot,
} from '../entities/recovery-snapshot.entity';
import type { RecoverySourceContext } from '../../../../shared/source-context';

export interface RecoverySnapshotQueryOptions {
  limit?: number;
}

export interface UpsertRecoverySnapshotRepositoryInput {
  userProfileId: string;
  date: string;
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: RecoveryTrend;
  recommendedIntensity: RecommendedIntensity;
  influences: RecoveryInfluenceProps[];
  formulaVersion: string;
  sourceContext: RecoverySourceContext;
  generatedBy: 'deterministic';
}

export interface RecoverySnapshotRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<RecoverySnapshot | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<RecoverySnapshot | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: RecoverySnapshotQueryOptions,
  ): Promise<RecoverySnapshot[]>;
  findRecentByUserProfileId(
    userProfileId: string,
    options?: RecoverySnapshotQueryOptions,
  ): Promise<RecoverySnapshot[]>;
  upsertDailySnapshot(
    input: UpsertRecoverySnapshotRepositoryInput,
  ): Promise<RecoverySnapshot>;
}

export const RECOVERY_SNAPSHOT_REPOSITORY = Symbol(
  'RECOVERY_SNAPSHOT_REPOSITORY',
);
