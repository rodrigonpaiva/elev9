import { PersonalizationSnapshot } from '../entities/personalization-snapshot.entity';
import type { PersonalizationSourceContext } from '../../../../shared/source-context';
import type {
  CoachingStyle,
  EngagementProfile,
  PersonalizationTrend,
  ResponsivenessLevel,
} from '../personalization.types';

export interface PersonalizationSnapshotQueryOptions {
  limit?: number;
}

export interface UpsertPersonalizationSnapshotRepositoryInput {
  userProfileId: string;
  date: string;
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  riskOfDisengagement: ResponsivenessLevel;
  trend: PersonalizationTrend;
  sourceContext: PersonalizationSourceContext;
  formulaVersion: string;
  generatedAt: string;
}

export interface PersonalizationSnapshotRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<PersonalizationSnapshot | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<PersonalizationSnapshot | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: PersonalizationSnapshotQueryOptions,
  ): Promise<PersonalizationSnapshot[]>;
  findById(id: string): Promise<PersonalizationSnapshot | null>;
  upsertDailySnapshot(
    input: UpsertPersonalizationSnapshotRepositoryInput,
  ): Promise<PersonalizationSnapshot>;
}

export const PERSONALIZATION_SNAPSHOT_REPOSITORY = Symbol(
  'PERSONALIZATION_SNAPSHOT_REPOSITORY',
);
