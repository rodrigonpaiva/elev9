import type { NotificationDecisionResponse } from './notification-response.type';

export class GetNotificationHistoryResponseDto {
  notificationDecisions!: NotificationDecisionResponse[];
  limit!: number;
}
