import type { NotificationDecisionResponse } from './notification-response.type';

export type NotificationEngagementEventResponse = {
  id: string;
  userProfileId: string;
  notificationDecisionId?: string;
  type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type NotificationHistoryEntryResponse = {
  id: string;
  userProfileId: string;
  notificationDecisionId: string;
  previousStatus?:
    | 'planned'
    | 'sent'
    | 'opened'
    | 'dismissed'
    | 'completed'
    | 'skipped';
  nextStatus:
    | 'planned'
    | 'sent'
    | 'opened'
    | 'dismissed'
    | 'completed'
    | 'skipped';
  reason?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export class RecordEngagementEventResponseDto {
  engagementEvent!: NotificationEngagementEventResponse;
  notificationDecision!: NotificationDecisionResponse;
  historyEntry?: NotificationHistoryEntryResponse;
}
