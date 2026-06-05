import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';

export const GET_CURRENT_NOTIFICATION_ERROR_CODES = NOTIFICATION_READ_ERROR_CODES;

export class GetCurrentNotificationError extends NotificationReadError {}
