import type { NotificationStatus } from '../notifications.types';

export interface NotificationHistoryQueryOptions {
  limit?: number;
}

export interface NotificationHistoryRecord {
  id: string;
  userProfileId: string;
  notificationDecisionId: string;
  previousStatus?: NotificationStatus;
  nextStatus: NotificationStatus;
  reason?: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateNotificationHistoryRepositoryInput {
  userProfileId: string;
  notificationDecisionId: string;
  previousStatus?: NotificationStatus;
  nextStatus: NotificationStatus;
  reason?: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface NotificationHistoryRepository {
  create(
    input: CreateNotificationHistoryRepositoryInput,
  ): Promise<NotificationHistoryRecord>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: NotificationHistoryQueryOptions,
  ): Promise<NotificationHistoryRecord[]>;
  findManyByNotificationDecisionId(
    notificationDecisionId: string,
    options?: NotificationHistoryQueryOptions,
  ): Promise<NotificationHistoryRecord[]>;
}

export const NOTIFICATION_HISTORY_REPOSITORY = Symbol(
  'NOTIFICATION_HISTORY_REPOSITORY',
);
