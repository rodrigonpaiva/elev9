import type { EngagementEventType } from '../../../domain/notifications.types';

export type RecordEngagementEventInput = {
  authUserId: string;
  notificationId: string;
  type: EngagementEventType;
  metadata?: Record<string, unknown>;
};
