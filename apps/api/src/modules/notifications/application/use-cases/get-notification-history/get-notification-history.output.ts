import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';

export type GetNotificationHistoryOutput = {
  notificationDecisions: NotificationDecision[];
  limit: number;
};
