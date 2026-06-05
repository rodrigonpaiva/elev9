import type {
  NotificationReplayComparisonResponse,
  NotificationReplayRecalculatedResponse,
  NotificationDecisionResponse,
} from './notification-response.type';

export class ReplayNotificationDecisionResponseDto {
  persisted!: NotificationDecisionResponse;
  recalculated!: NotificationReplayRecalculatedResponse;
  comparison!: NotificationReplayComparisonResponse;
  replayedAt!: string;
}
