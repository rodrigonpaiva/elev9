import { Inject, Injectable } from '@nestjs/common';

import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  BEHAVIORAL_PATTERN_REPOSITORY,
  BehavioralPatternRepository,
  UpsertBehavioralPatternRepositoryInput,
} from '../../../domain/repositories/behavioral-pattern.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { PersonalizationCalculatorService } from '../../services/personalization-calculator.service';
import {
  BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES,
  BuildBehavioralPatternsError,
} from './build-behavioral-patterns.errors';
import { BuildBehavioralPatternsInput } from './build-behavioral-patterns.input';
import { BuildBehavioralPatternsOutput } from './build-behavioral-patterns.output';
import type { BehavioralPatternType } from '../../../domain/personalization.types';

const PERSONALIZATION_CALCULATOR_VERSION = 'personalization-engine-v1';

@Injectable()
export class BuildBehavioralPatternsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    @Inject(BEHAVIORAL_PATTERN_REPOSITORY)
    private readonly behavioralPatternRepository: BehavioralPatternRepository,
    private readonly personalizationCalculatorService: PersonalizationCalculatorService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildBehavioralPatternsInput,
  ): Promise<BuildBehavioralPatternsOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildBehavioralPatternsError(
        BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildBehavioralPatternsError(
          BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestSnapshot =
        await this.personalizationSnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const todayDate = this.platformDateService.getTodayDateString();
      const sourceContext = latestSnapshot?.sourceContext ?? {
        formulaVersion: PERSONALIZATION_CALCULATOR_VERSION,
        generatedAt: `${todayDate}T00:00:00.000Z`,
        engagementScore: 50,
        notificationDismissalRate: 0,
        notificationCompletionRate: 0,
        consistencyScore: 50,
        habitTrend: 'stable' as const,
        habitRiskLevel: 'low' as const,
        goalTrend: 'stable' as const,
        goalMilestoneReached: false,
        goalAchievementReached: false,
        recoveryTrend: 'stable' as const,
        recoveryAlertEngagement: 50,
        coachDecisionPriorityHistory: [],
        activityHourDistribution: {
          morning: 0,
          afternoon: 0,
          evening: 0,
        },
        previousSnapshotScore: 50,
      };
      const calculatorResult =
        this.personalizationCalculatorService.calculate(sourceContext);
      const observedAt = latestSnapshot
        ? new Date(latestSnapshot.generatedAt)
        : new Date(`${todayDate}T00:00:00.000Z`);

      const patterns = calculatorResult.behavioralPatterns.map((type) =>
        this.toPatternInput({
          userProfileId: userProfile.id,
          type,
          sourceContext,
          observedAt,
        }),
      );

      const persistedPatterns =
        await this.behavioralPatternRepository.replaceManyByUserProfileId(
          userProfile.id,
          patterns,
        );

      return {
        behavioralPatterns: persistedPatterns,
      };
    } catch (error) {
      if (error instanceof BuildBehavioralPatternsError) {
        throw error;
      }

      throw new BuildBehavioralPatternsError(
        BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private toPatternInput(input: {
    userProfileId: string;
    type: string;
    sourceContext: {
      engagementScore?: number;
      notificationDismissalRate?: number;
      notificationCompletionRate?: number;
      consistencyScore?: number;
      habitTrend?: 'improving' | 'stable' | 'declining';
      habitRiskLevel?: 'low' | 'medium' | 'high';
      goalTrend?: 'improving' | 'stable' | 'declining';
      goalMilestoneReached?: boolean;
      goalAchievementReached?: boolean;
      recoveryTrend?: 'improving' | 'stable' | 'declining';
      recoveryAlertEngagement?: number;
      activityHourDistribution?: {
        morning: number;
        afternoon: number;
        evening: number;
      };
    };
    observedAt: Date;
  }): UpsertBehavioralPatternRepositoryInput {
    const confidence = this.resolveConfidence(input.type, input.sourceContext);

    return {
      userProfileId: input.userProfileId,
      type: input.type as BehavioralPatternType,
      confidence,
      evidenceCount: this.resolveEvidenceCount(input.type, input.sourceContext),
      lastObservedAt: input.observedAt,
      formulaVersion: PERSONALIZATION_CALCULATOR_VERSION,
    };
  }

  private resolveEvidenceCount(
    type: string,
    sourceContext: {
      engagementScore?: number;
      notificationDismissalRate?: number;
      notificationCompletionRate?: number;
      consistencyScore?: number;
      habitTrend?: 'improving' | 'stable' | 'declining';
      goalMilestoneReached?: boolean;
      goalAchievementReached?: boolean;
      recoveryAlertEngagement?: number;
      activityHourDistribution?: {
        morning: number;
        afternoon: number;
        evening: number;
      };
    },
  ): number {
    switch (type) {
      case 'responds_to_streaks':
        return Number(sourceContext.consistencyScore !== undefined) +
          Number(sourceContext.habitTrend === 'improving');
      case 'responds_to_goals':
        return Number(Boolean(sourceContext.goalMilestoneReached)) +
          Number(Boolean(sourceContext.goalAchievementReached));
      case 'responds_to_recovery_guidance':
        return 1;
      case 'responds_to_notifications':
        return 2;
      case 'ignores_low_priority_reminders':
        return 1;
      case 'morning_engagement':
      case 'evening_engagement':
        return 1;
      case 'high_dismissal_behavior':
        return 1;
      case 'consistent_check_in_behavior':
        return 1;
      default:
        return 1;
    }
  }

  private resolveConfidence(
    type: string,
    sourceContext: {
      engagementScore?: number;
      notificationDismissalRate?: number;
      notificationCompletionRate?: number;
      consistencyScore?: number;
      habitTrend?: 'improving' | 'stable' | 'declining';
      goalMilestoneReached?: boolean;
      goalAchievementReached?: boolean;
      recoveryAlertEngagement?: number;
      activityHourDistribution?: {
        morning: number;
        afternoon: number;
        evening: number;
      };
    },
  ): 'low' | 'medium' | 'high' {
    const score = this.resolvePatternScore(type, sourceContext);
    return this.personalizationCalculatorService.resolveLevel(score);
  }

  private resolvePatternScore(
    type: string,
    sourceContext: {
      engagementScore?: number;
      notificationDismissalRate?: number;
      notificationCompletionRate?: number;
      consistencyScore?: number;
      habitTrend?: 'improving' | 'stable' | 'declining';
      goalMilestoneReached?: boolean;
      goalAchievementReached?: boolean;
      recoveryAlertEngagement?: number;
      activityHourDistribution?: {
        morning: number;
        afternoon: number;
        evening: number;
      };
    },
  ): number {
    switch (type) {
      case 'responds_to_streaks':
        return this.personalizationCalculatorService.averageScore([
          sourceContext.consistencyScore ?? 50,
          sourceContext.habitTrend === 'improving'
            ? 100
            : sourceContext.habitTrend === 'declining'
              ? 0
              : 50,
        ]);
      case 'responds_to_goals':
        return sourceContext.goalAchievementReached
          ? 100
          : sourceContext.goalMilestoneReached
            ? 80
            : 0;
      case 'responds_to_recovery_guidance':
        return sourceContext.recoveryAlertEngagement ?? 50;
      case 'responds_to_notifications':
        return this.personalizationCalculatorService.averageScore([
          sourceContext.engagementScore ?? 50,
          sourceContext.notificationCompletionRate ?? 50,
        ]);
      case 'ignores_low_priority_reminders':
        return sourceContext.notificationDismissalRate ?? 50;
      case 'morning_engagement':
      case 'evening_engagement': {
        const distribution = sourceContext.activityHourDistribution ?? {
          morning: 0,
          afternoon: 0,
          evening: 0,
        };
        const total =
          distribution.morning + distribution.afternoon + distribution.evening;

        if (!total) {
          return 0;
        }

        const bucket =
          type === 'morning_engagement'
            ? distribution.morning
            : distribution.evening;

        return Math.round((bucket / total) * 100);
      }
      case 'high_dismissal_behavior':
        return sourceContext.notificationDismissalRate ?? 50;
      case 'consistent_check_in_behavior':
        return sourceContext.consistencyScore ?? 50;
      default:
        return 50;
    }
  }
}
