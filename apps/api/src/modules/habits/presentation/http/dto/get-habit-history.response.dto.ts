import type { HabitSnapshotResponse } from './habit-snapshot-response.type';

export class GetHabitHistoryResponseDto {
  habitSnapshots!: HabitSnapshotResponse[];
  limit!: number;
}
