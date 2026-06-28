import type { PersonalizationSnapshot } from '../../../domain/entities/personalization-snapshot.entity';
import type {
  PersonalizationReplayComparisonContract,
  PersonalizationReplayRecalculatedSnapshotContract,
} from '../../../domain/personalization.contract';

export type ReplayPersonalizationSnapshotComparisonField =
  | 'preferredCoachingStyle'
  | 'engagementProfile'
  | 'notificationResponsiveness'
  | 'goalResponsiveness'
  | 'recoveryResponsiveness'
  | 'habitResponsiveness'
  | 'riskOfDisengagement'
  | 'trend'
  | 'formulaVersion';

export interface ReplayPersonalizationSnapshotRecalculated extends PersonalizationReplayRecalculatedSnapshotContract {}

export interface ReplayPersonalizationSnapshotOutput {
  persisted: PersonalizationSnapshot;
  recalculated: ReplayPersonalizationSnapshotRecalculated;
  comparison: PersonalizationReplayComparisonContract;
  replayedAt: string;
}
