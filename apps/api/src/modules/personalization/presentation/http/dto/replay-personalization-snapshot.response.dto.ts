import type {
  PersonalizationReplayComparisonResponse,
  PersonalizationReplayRecalculatedResponse,
  PersonalizationReplayResponse,
} from './personalization-replay-response.type';

export class ReplayPersonalizationSnapshotResponseDto {
  persisted!: PersonalizationReplayResponse['persisted'];
  recalculated!: PersonalizationReplayRecalculatedResponse;
  comparison!: PersonalizationReplayComparisonResponse;
  replayedAt!: string;
}
