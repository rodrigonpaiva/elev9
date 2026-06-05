import type { EngagementEventType } from '../notifications.types';

export interface EngagementEventQueryOptions {
  limit?: number;
}

export interface EngagementEventRecord {
  id: string;
  userProfileId: string;
  notificationDecisionId?: string;
  type: EngagementEventType;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateEngagementEventRepositoryInput {
  userProfileId: string;
  notificationDecisionId?: string;
  type: EngagementEventType;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EngagementEventRepository {
  create(
    input: CreateEngagementEventRepositoryInput,
  ): Promise<EngagementEventRecord>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]>;
  findManyByNotificationDecisionId(
    notificationDecisionId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]>;
  findRecentByUserProfileId(
    userProfileId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]>;
}

export const ENGAGEMENT_EVENT_REPOSITORY = Symbol(
  'ENGAGEMENT_EVENT_REPOSITORY',
);
