import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';

export const GET_ENGAGEMENT_SUMMARY_ERROR_CODES = NOTIFICATION_READ_ERROR_CODES;

export class GetEngagementSummaryError extends NotificationReadError {}
