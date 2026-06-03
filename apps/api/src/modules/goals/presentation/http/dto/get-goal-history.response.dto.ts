import { GoalProgressSnapshotResponse } from './goal-response.type';

export class GetGoalHistoryResponseDto {
  goalProgressSnapshots!: GoalProgressSnapshotResponse[];
  limit!: number;
}
