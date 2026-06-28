import type { EngagementEventRecord } from '../../../domain/repositories/engagement-event.repository';
import type { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import type { NotificationHistoryRecord } from '../../../domain/repositories/notification-history.repository';

export type RecordEngagementEventOutput = {
  engagementEvent: EngagementEventRecord;
  notificationDecision: NotificationDecision;
  historyEntry?: NotificationHistoryRecord;
};
