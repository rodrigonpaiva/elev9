import type {
  HabitReplayComparisonResponse,
  HabitReplayRecalculatedResponse,
  HabitSnapshotResponse,
} from './habit-snapshot-response.type';

export class ReplayHabitSnapshotResponseDto {
  persisted!: HabitSnapshotResponse;
  recalculated!: HabitReplayRecalculatedResponse;
  comparison!: HabitReplayComparisonResponse;
  replayedAt!: string;
}
