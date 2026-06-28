import {
  GoalForecastResponse,
  GoalProgressSnapshotResponse,
  GoalResponse,
} from './goal-response.type';

export class GetCurrentGoalResponseDto {
  goal!: GoalResponse;
  progressSnapshot!: GoalProgressSnapshotResponse;
  forecast!: GoalForecastResponse;
}
