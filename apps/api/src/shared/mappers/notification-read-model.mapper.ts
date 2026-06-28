import type { NotificationFatigueLevel } from '../../modules/notifications/domain/notifications.types';
import type { NotificationType } from '../../modules/notifications/domain/notifications.types';

export type NotificationReadModelPayload = {
  current?: NotificationReadModelCurrentPayload;
  engagementSummary?: NotificationEngagementSummary;
};

export type NotificationReadModelCurrentPayload = {
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  suppressed: boolean;
  fatigueLevel: NotificationFatigueLevel;
};

export type NotificationCoachDecisionSignals = {
  notificationSuppressed: boolean;
  notificationFatigueHigh: boolean;
  notificationDismissedFrequently: boolean;
  notificationHighEngagement: boolean;
};

export type NotificationPromptPayload = {
  current?: NotificationReadModelCurrentPayload;
  engagementSummary?: NotificationEngagementSummaryPreview;
};

export type NotificationMemoryPayload = {
  notificationType?: NotificationType;
  suppressed: boolean;
  fatigueLevel: NotificationFatigueLevel;
  engagementScore: number;
};

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
type NotificationStatus =
  | 'planned'
  | 'sent'
  | 'opened'
  | 'dismissed'
  | 'completed'
  | 'skipped';

export type NotificationEngagementSummary = {
  engagementScore: number;
  fatigueLevel: NotificationFatigueLevel;
  openedCount: number;
  clickedCount: number;
  dismissedCount: number;
  completedCount: number;
  recentEventsCount: number;
};

export type NotificationEngagementSummaryPreview = Pick<
  NotificationEngagementSummary,
  'engagementScore' | 'fatigueLevel' | 'dismissedCount' | 'recentEventsCount'
>;

type NotificationValueLike<T extends string> = T | { value: T };

type NotificationDecisionLike = {
  type: NotificationValueLike<NotificationType>;
  priority: NotificationValueLike<NotificationPriority>;
  status: NotificationValueLike<NotificationStatus>;
  suppressed?: boolean;
  fatigueLevel?: NotificationFatigueLevel;
};

export class NotificationReadModelMapper {
  static toDashboardPayload(
    current: NotificationDecisionLike | null | undefined,
    engagementSummary: NotificationEngagementSummary | null | undefined,
  ): NotificationReadModelPayload | undefined {
    if (!current && !engagementSummary) {
      return undefined;
    }

    return {
      ...(current
        ? {
            current: this.toCurrentPayload(current),
          }
        : {}),
      ...(engagementSummary ? { engagementSummary } : {}),
    };
  }

  static toPromptPayload(
    current: NotificationDecisionLike | null | undefined,
    engagementSummary:
      | NotificationEngagementSummary
      | NotificationEngagementSummaryPreview
      | null
      | undefined,
  ): NotificationPromptPayload | undefined {
    if (!current && !engagementSummary) {
      return undefined;
    }

    return {
      ...(current
        ? {
            current: this.toCurrentPayload(current),
          }
        : {}),
      ...(engagementSummary
        ? {
            engagementSummary: {
              engagementScore: engagementSummary.engagementScore,
              fatigueLevel: engagementSummary.fatigueLevel,
              dismissedCount: engagementSummary.dismissedCount,
              recentEventsCount: engagementSummary.recentEventsCount,
            },
          }
        : {}),
    };
  }

  static toMemoryPayload(
    current: NotificationDecisionLike | null | undefined,
    engagementSummary:
      | NotificationEngagementSummary
      | NotificationEngagementSummaryPreview
      | null
      | undefined,
  ): NotificationMemoryPayload | undefined {
    if (!current && !engagementSummary) {
      return undefined;
    }

    return {
      notificationType: current ? this.unwrapValue(current.type) : undefined,
      suppressed: current?.suppressed ?? false,
      fatigueLevel: current?.fatigueLevel ?? 'low',
      engagementScore: engagementSummary?.engagementScore ?? 50,
    };
  }

  static toCoachDecisionSignals(
    current: NotificationDecisionLike | null | undefined,
    engagementSummary:
      | NotificationEngagementSummary
      | NotificationEngagementSummaryPreview
      | null
      | undefined,
  ): NotificationCoachDecisionSignals | undefined {
    if (!current && !engagementSummary) {
      return undefined;
    }

    const engagementScore = engagementSummary?.engagementScore ?? 50;
    const dismissedCount = engagementSummary?.dismissedCount ?? 0;

    return {
      notificationSuppressed: current?.suppressed ?? false,
      notificationFatigueHigh:
        (current?.fatigueLevel ?? engagementSummary?.fatigueLevel) === 'high',
      notificationDismissedFrequently: dismissedCount >= 2,
      notificationHighEngagement: engagementScore >= 80,
    };
  }

  private static toCurrentPayload(
    current: NotificationDecisionLike,
  ): NotificationReadModelCurrentPayload {
    return {
      type: this.unwrapValue(current.type),
      priority: this.unwrapValue(current.priority),
      status: this.unwrapValue(current.status),
      suppressed: current.suppressed ?? false,
      fatigueLevel: current.fatigueLevel ?? 'low',
    };
  }

  private static unwrapValue<T extends string>(
    value: NotificationValueLike<T>,
  ): T {
    return typeof value === 'string' ? value : value.value;
  }
}
