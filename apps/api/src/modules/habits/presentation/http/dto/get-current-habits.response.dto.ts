import type { HabitSnapshotResponse } from './habit-snapshot-response.type';

export class GetCurrentHabitsResponseDto {
  habitSnapshot!: HabitSnapshotResponse;
}
