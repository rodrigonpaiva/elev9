import type { NotificationDecision } from '../entities/notification-decision.entity';
import type {
  NotificationChannel,
  NotificationFatigueLevel,
  NotificationPriority,
  NotificationSourceContext,
  NotificationStatus,
  NotificationSuppressionReason,
  NotificationType,
} from '../notifications.types';
import type { NotificationInfluencePropsInput } from '../value-objects/notification-influence.value-object';

export interface NotificationDecisionQueryOptions {
  limit?: number;
}

export interface UpsertNotificationDecisionRepositoryInput {
  userProfileId: string;
  date: string;
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationInfluencePropsInput[];
  sourceContext: NotificationSourceContext;
  suppressed?: boolean;
  suppressionReasons?: NotificationSuppressionReason[];
  fatigueLevel?: NotificationFatigueLevel;
  formulaVersion: string;
  generatedBy: 'deterministic';
}

export interface NotificationDecisionRepository {
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<NotificationDecision | null>;
  findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<NotificationDecision | null>;
  findManyByUserProfileId(
    userProfileId: string,
    options?: NotificationDecisionQueryOptions,
  ): Promise<NotificationDecision[]>;
  findById(id: string): Promise<NotificationDecision | null>;
  updateStatus(
    notificationDecisionId: string,
    status: NotificationStatus,
  ): Promise<NotificationDecision | null>;
  upsertDailyDecision(
    input: UpsertNotificationDecisionRepositoryInput,
  ): Promise<NotificationDecision>;
}

export const NOTIFICATION_DECISION_REPOSITORY = Symbol(
  'NOTIFICATION_DECISION_REPOSITORY',
);
