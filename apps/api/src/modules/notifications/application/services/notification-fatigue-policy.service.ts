import { Injectable } from '@nestjs/common';

import type {
  NotificationFatigueEvaluation,
  NotificationPriority,
  NotificationSuppressionReason,
  NotificationType,
} from '../../domain/notifications.types';

export type NotificationFatiguePolicyInput = {
  candidateType: NotificationType;
  candidatePriority: NotificationPriority;
  recentNotificationsCount: number;
  recentSameTypeCount: number;
  dismissedCount: number;
  engagementScore: number;
  hoursSinceLastNotification?: number;
};

@Injectable()
export class NotificationFatiguePolicyService {
  evaluate(
    input: NotificationFatiguePolicyInput,
  ): NotificationFatigueEvaluation {
    const fatigueLevel = this.resolveFatigueLevel(input);

    if (input.candidatePriority === 'urgent') {
      return {
        suppressed: false,
        fatigueLevel,
        reasons: [],
      };
    }

    const reasons: NotificationSuppressionReason[] = [];

    if (input.recentNotificationsCount >= 5) {
      reasons.push('daily_cap_reached');
    }

    if (input.recentSameTypeCount >= 2) {
      reasons.push('same_type_cooldown');
    }

    if (input.dismissedCount >= 3) {
      reasons.push('high_dismissal_ratio');
    }

    if (input.engagementScore >= 80 && input.candidatePriority === 'low') {
      reasons.push('already_engaged');
    }

    if (
      typeof input.hoursSinceLastNotification === 'number' &&
      input.hoursSinceLastNotification < 4 &&
      input.candidatePriority === 'low'
    ) {
      reasons.push('recent_notification');
    }

    return {
      suppressed: reasons.length > 0,
      fatigueLevel,
      reasons,
    };
  }

  private resolveFatigueLevel(
    input: NotificationFatiguePolicyInput,
  ): 'low' | 'medium' | 'high' {
    if (input.recentNotificationsCount >= 5 || input.dismissedCount >= 4) {
      return 'high';
    }

    if (input.recentNotificationsCount >= 3 || input.dismissedCount >= 2) {
      return 'medium';
    }

    return 'low';
  }
}
