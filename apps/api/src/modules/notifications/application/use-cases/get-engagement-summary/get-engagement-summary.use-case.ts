import { Inject, Injectable } from '@nestjs/common';

import {
  NOTIFICATION_READ_ERROR_CODES,
  NotificationReadError,
} from '../../services/notification-read.errors';
import {
  ENGAGEMENT_EVENT_REPOSITORY,
  EngagementEventRepository,
} from '../../../domain/repositories/engagement-event.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import type { GetEngagementSummaryInput } from './get-engagement-summary.input';
import type { GetEngagementSummaryOutput } from './get-engagement-summary.output';
import { GetEngagementSummaryError } from './get-engagement-summary.errors';

const RECENT_ENGAGEMENT_LIMIT = 20;

@Injectable()
export class GetEngagementSummaryUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(ENGAGEMENT_EVENT_REPOSITORY)
    private readonly engagementEventRepository: EngagementEventRepository,
  ) {}

  async execute(
    input: GetEngagementSummaryInput,
  ): Promise<GetEngagementSummaryOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetEngagementSummaryError(
        NOTIFICATION_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetEngagementSummaryError(
          NOTIFICATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const recentEvents =
        await this.engagementEventRepository.findRecentByUserProfileId(
          userProfile.id,
          {
            limit: RECENT_ENGAGEMENT_LIMIT,
          },
        );

      const openedCount = recentEvents.filter(
        (event) => event.type === 'opened',
      ).length;
      const clickedCount = recentEvents.filter(
        (event) => event.type === 'clicked',
      ).length;
      const dismissedCount = recentEvents.filter(
        (event) => event.type === 'dismissed',
      ).length;
      const completedCount = recentEvents.filter(
        (event) => event.type === 'completed',
      ).length;
      const recentEventsCount = recentEvents.length;
      const engagementScore = this.resolveEngagementScore({
        openedCount,
        clickedCount,
        dismissedCount,
        completedCount,
      });
      const fatigueLevel = this.resolveFatigueLevel({
        recentEventsCount,
        dismissedCount,
      });

      return {
        engagementSummary: {
          engagementScore,
          fatigueLevel,
          openedCount,
          clickedCount,
          dismissedCount,
          completedCount,
          recentEventsCount,
        },
      };
    } catch (error) {
      if (error instanceof NotificationReadError) {
        throw error;
      }

      throw new GetEngagementSummaryError(
        NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolveEngagementScore(input: {
    openedCount: number;
    clickedCount: number;
    dismissedCount: number;
    completedCount: number;
  }): number {
    const score =
      50 +
      input.openedCount * 10 +
      input.clickedCount * 15 +
      input.completedCount * 20 -
      input.dismissedCount * 15;

    return Math.max(0, Math.min(100, score));
  }

  private resolveFatigueLevel(input: {
    recentEventsCount: number;
    dismissedCount: number;
  }): 'low' | 'medium' | 'high' {
    if (input.recentEventsCount >= 8 || input.dismissedCount >= 4) {
      return 'high';
    }

    if (input.recentEventsCount >= 4 || input.dismissedCount >= 2) {
      return 'medium';
    }

    return 'low';
  }
}
