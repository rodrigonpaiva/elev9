import { Inject, Injectable } from '@nestjs/common';

import { ReplayComparator } from '../../../../../shared/replay';
import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  type PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  type UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  PersonalizationCalculatorService,
  type PersonalizationCalculationInput,
} from '../../services/personalization-calculator.service';
import {
  REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES,
  ReplayPersonalizationSnapshotError,
} from './replay-personalization-snapshot.errors';
import type { ReplayPersonalizationSnapshotInput } from './replay-personalization-snapshot.input';
import type {
  ReplayPersonalizationSnapshotComparisonField,
  ReplayPersonalizationSnapshotOutput,
  ReplayPersonalizationSnapshotRecalculated,
} from './replay-personalization-snapshot.output';
import type { PersonalizationSourceContext } from '../../../../../shared/source-context';

const COMPARISON_FIELDS: readonly ReplayPersonalizationSnapshotComparisonField[] =
  [
    'preferredCoachingStyle',
    'engagementProfile',
    'notificationResponsiveness',
    'goalResponsiveness',
    'recoveryResponsiveness',
    'habitResponsiveness',
    'riskOfDisengagement',
    'trend',
    'formulaVersion',
  ] as const;

@Injectable()
export class ReplayPersonalizationSnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    private readonly personalizationCalculatorService: PersonalizationCalculatorService,
  ) {}

  async execute(
    input: ReplayPersonalizationSnapshotInput,
  ): Promise<ReplayPersonalizationSnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';
    const personalizationSnapshotId =
      typeof input.personalizationSnapshotId === 'string'
        ? input.personalizationSnapshotId.trim()
        : '';

    if (!authUserId) {
      throw new ReplayPersonalizationSnapshotError(
        REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    if (!personalizationSnapshotId) {
      throw new ReplayPersonalizationSnapshotError(
        REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
        'Invalid personalization snapshot id.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplayPersonalizationSnapshotError(
          REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const persisted = await this.personalizationSnapshotRepository.findById(
        personalizationSnapshotId,
      );

      if (!persisted || persisted.userProfileId !== userProfile.id) {
        throw new ReplayPersonalizationSnapshotError(
          REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.PERSONALIZATION_SNAPSHOT_NOT_FOUND,
          'Personalization snapshot not found.',
        );
      }

      const recalculated = this.recalculate(persisted.sourceContext);
      const comparison = ReplayComparator.compare({
        persisted: persisted.toJSON(),
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
      if (error instanceof ReplayPersonalizationSnapshotError) {
        throw error;
      }

      throw new ReplayPersonalizationSnapshotError(
        REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private recalculate(
    sourceContext: PersonalizationSourceContext,
  ): ReplayPersonalizationSnapshotRecalculated {
    const result = this.personalizationCalculatorService.calculate(
      this.mapSourceContextToCalculatorInput(sourceContext),
    );

    return {
      preferredCoachingStyle: result.preferredCoachingStyle,
      engagementProfile: result.engagementProfile,
      notificationResponsiveness: result.notificationResponsiveness,
      goalResponsiveness: result.goalResponsiveness,
      recoveryResponsiveness: result.recoveryResponsiveness,
      habitResponsiveness: result.habitResponsiveness,
      riskOfDisengagement: result.riskOfDisengagement,
      trend: result.trend,
      formulaVersion: result.formulaVersion,
    };
  }

  private mapSourceContextToCalculatorInput(
    sourceContext: PersonalizationSourceContext,
  ): PersonalizationCalculationInput {
    return {
      engagementScore: sourceContext.engagementScore,
      notificationDismissalRate: sourceContext.notificationDismissalRate,
      notificationCompletionRate: sourceContext.notificationCompletionRate,
      consistencyScore: sourceContext.consistencyScore,
      habitTrend: sourceContext.habitTrend,
      habitRiskLevel: sourceContext.habitRiskLevel,
      goalTrend: sourceContext.goalTrend,
      goalMilestoneReached: sourceContext.goalMilestoneReached,
      goalAchievementReached: sourceContext.goalAchievementReached,
      recoveryTrend: sourceContext.recoveryTrend,
      recoveryAlertEngagement: sourceContext.recoveryAlertEngagement,
      coachDecisionPriorityHistory: sourceContext.coachDecisionPriorityHistory,
      activityHourDistribution: sourceContext.activityHourDistribution,
      previousSnapshotScore: sourceContext.previousSnapshotScore,
    };
  }
}
