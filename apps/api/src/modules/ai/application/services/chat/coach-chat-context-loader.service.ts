import { Injectable } from '@nestjs/common';

import {
  CoachDecisionReadModelMapper,
  HabitReadModelMapper,
  NotificationReadModelMapper,
  PersonalizationReadModelMapper,
} from '../../../../../shared/mappers';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentCoachDecisionUseCase } from '../../use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { Inject } from '@nestjs/common';

import { CoachChatLoadedContext } from '../../use-cases/create-coach-chat/create-coach-chat.types';
import {
  CreateCoachChatError,
  CREATE_COACH_CHAT_ERROR_CODES,
} from '../../use-cases/create-coach-chat/create-coach-chat.errors';

@Injectable()
export class CoachChatContextLoaderService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
  ) {}

  async load(authUserId: string): Promise<CoachChatLoadedContext> {
    const userProfile =
      await this.userProfileRepository.findByAuthUserId(authUserId);

    if (!userProfile) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      );
    }

    const healthContext = await this.buildUserHealthContextService.build({
      authUserId,
    });
    const coachDecision = await this.resolveCoachDecision(authUserId);
    const notification = await this.resolveNotification(authUserId);
    const habit = await this.resolveHabit(authUserId);
    const personalization = await this.resolvePersonalization(authUserId);

    return {
      userProfileId: userProfile.id,
      healthContext,
      coachDecision: CoachDecisionReadModelMapper.toChatPayload(coachDecision),
      notification: notification
        ? NotificationReadModelMapper.toPromptPayload(
            notification.current,
            notification.engagementSummary,
          )
        : undefined,
      notificationMemory: notification
        ? NotificationReadModelMapper.toMemoryPayload(
            notification.current,
            notification.engagementSummary,
          )
        : undefined,
      habit: HabitReadModelMapper.toPromptPayload(habit),
      habitMemory: HabitReadModelMapper.toMemoryPayload(habit),
      personalization:
        PersonalizationReadModelMapper.toPromptPayload(personalization),
      personalizationMemory:
        PersonalizationReadModelMapper.toMemoryPayload(personalization),
    };
  }

  private async resolveCoachDecision(authUserId: string) {
    try {
      const result = await this.getCurrentCoachDecisionUseCase.execute({
        authUserId,
      });

      return result?.coachDecision;
    } catch {
      return undefined;
    }
  }

  private async resolveNotification(authUserId: string) {
    try {
      const [currentResult, engagementSummaryResult] = await Promise.allSettled(
        [
          this.getCurrentNotificationUseCase.execute({
            authUserId,
          }),
          this.getEngagementSummaryUseCase.execute({
            authUserId,
          }),
        ],
      );

      return {
        current:
          currentResult.status === 'fulfilled'
            ? currentResult.value.notificationDecision
            : undefined,
        engagementSummary:
          engagementSummaryResult.status === 'fulfilled'
            ? engagementSummaryResult.value.engagementSummary
            : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private async resolveHabit(authUserId: string) {
    try {
      const [currentResult, summaryResult, riskSignalsResult] =
        await Promise.allSettled([
          this.getCurrentHabitsUseCase.execute({ authUserId }),
          this.getConsistencySummaryUseCase.execute({ authUserId }),
          this.getHabitRiskSignalsUseCase.execute({ authUserId }),
        ]);

      return {
        current:
          currentResult.status === 'fulfilled'
            ? currentResult.value.habitSnapshot
            : undefined,
        summary:
          summaryResult.status === 'fulfilled'
            ? summaryResult.value.consistencySummary
            : undefined,
        riskSignals:
          riskSignalsResult.status === 'fulfilled'
            ? riskSignalsResult.value.habitRiskSignals
            : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private async resolvePersonalization(authUserId: string) {
    try {
      const [snapshotResult, profileResult, patternsResult] =
        await Promise.allSettled([
          this.getCurrentPersonalizationUseCase.execute({ authUserId }),
          this.getUserBehaviorProfileUseCase.execute({ authUserId }),
          this.getBehavioralPatternsUseCase.execute({ authUserId }),
        ]);

      return {
        snapshot:
          snapshotResult.status === 'fulfilled'
            ? snapshotResult.value.personalizationSnapshot
            : undefined,
        profile:
          profileResult.status === 'fulfilled'
            ? profileResult.value.userBehaviorProfile
            : undefined,
        patterns:
          patternsResult.status === 'fulfilled'
            ? patternsResult.value.behavioralPatterns
            : undefined,
      };
    } catch {
      return undefined;
    }
  }
}
