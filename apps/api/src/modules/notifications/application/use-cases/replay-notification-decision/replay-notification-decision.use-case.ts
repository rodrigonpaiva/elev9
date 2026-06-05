import { Inject, Injectable } from '@nestjs/common';

import { ReplayComparator } from '../../../../../shared/replay';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  type NotificationDecisionRepository,
} from '../../../domain/repositories/notification-decision.repository';
import {
  USER_PROFILE_REPOSITORY,
  type UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  NotificationDecisionCalculatorService,
  type NotificationDecisionSourceInput,
} from '../../services/notification-decision-calculator.service';
import {
  REPLAY_NOTIFICATION_DECISION_ERROR_CODES,
  ReplayNotificationDecisionError,
} from './replay-notification-decision.errors';
import type { ReplayNotificationDecisionInput } from './replay-notification-decision.input';
import type {
  ReplayNotificationDecisionComparisonField,
  ReplayNotificationDecisionOutput,
  ReplayNotificationDecisionRecalculated,
} from './replay-notification-decision.output';

const COMPARISON_FIELDS: readonly ReplayNotificationDecisionComparisonField[] = [
  'type',
  'priority',
  'channel',
  'status',
  'title',
  'message',
  'actionLabel',
  'actionTarget',
  'influences',
  'formulaVersion',
  'generatedBy',
] as const;

@Injectable()
export class ReplayNotificationDecisionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    private readonly notificationDecisionCalculatorService: NotificationDecisionCalculatorService,
  ) {}

  async execute(
    input: ReplayNotificationDecisionInput,
  ): Promise<ReplayNotificationDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const notificationId =
      typeof input.notificationId === 'string' ? input.notificationId.trim() : '';

    if (!authUserId || !notificationId) {
      throw new ReplayNotificationDecisionError(
        REPLAY_NOTIFICATION_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid replay request.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplayNotificationDecisionError(
          REPLAY_NOTIFICATION_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const persisted =
        await this.notificationDecisionRepository.findById(notificationId);

      if (!persisted || persisted.userProfileId !== userProfile.id) {
        throw new ReplayNotificationDecisionError(
          REPLAY_NOTIFICATION_DECISION_ERROR_CODES.NOTIFICATION_NOT_FOUND,
          'Notification decision not found.',
        );
      }

      const recalculated = this.recalculate(persisted.sourceContext);
      const persistedSnapshot = persisted.toJSON();
      const comparison = ReplayComparator.compare({
        persisted: persistedSnapshot,
        recalculated,
        fields: COMPARISON_FIELDS,
      });

      return {
        persisted,
        recalculated,
        comparison,
        replayedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ReplayNotificationDecisionError) {
        throw error;
      }

      throw new ReplayNotificationDecisionError(
        REPLAY_NOTIFICATION_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private recalculate(
    sourceContext: ReplayNotificationDecisionInputSourceContext,
  ): ReplayNotificationDecisionRecalculated {
    const result = this.notificationDecisionCalculatorService.calculate({
      coachDecisionPriority: sourceContext.coachDecisionPriority,
      coachDecisionHeadline: sourceContext.coachDecisionHeadline,
      readinessScore: sourceContext.readinessScore,
      fatigueScore: sourceContext.fatigueScore,
      adaptiveRecommendationType: sourceContext.adaptiveRecommendationType,
      goalProgressTrend: sourceContext.goalProgressTrend,
      goalMilestoneClose: sourceContext.goalMilestoneClose,
      goalAchievementReached: sourceContext.goalAchievementReached,
      nutritionAdherence: sourceContext.nutritionAdherence,
      missedWorkouts: sourceContext.missedWorkouts,
      noRecentActivity: sourceContext.noRecentActivity,
      fatigueLevel: sourceContext.fatigueLevel,
    });

    return {
      type: result.type,
      priority: result.priority,
      channel: result.channel,
      status: result.status,
      title: result.title,
      message: result.message,
      actionLabel: result.actionLabel,
      actionTarget: result.actionTarget,
      influences: result.influences.map((influence) => influence.toJSON()),
      formulaVersion: result.formulaVersion,
      generatedBy: result.generatedBy,
    };
  }
}

type ReplayNotificationDecisionInputSourceContext = Pick<
  NotificationDecisionSourceInput,
  | 'coachDecisionPriority'
  | 'coachDecisionHeadline'
  | 'readinessScore'
  | 'fatigueScore'
  | 'adaptiveRecommendationType'
  | 'goalProgressTrend'
  | 'goalMilestoneClose'
  | 'goalAchievementReached'
  | 'nutritionAdherence'
  | 'missedWorkouts'
  | 'noRecentActivity'
  | 'fatigueLevel'
>;
