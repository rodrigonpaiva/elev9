import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';

export const GET_NOTIFICATION_HISTORY_ERROR_CODES = NOTIFICATION_READ_ERROR_CODES;

export class GetNotificationHistoryError extends NotificationReadError {}
