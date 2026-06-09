import { Inject, Injectable } from '@nestjs/common';

import {
  BEHAVIORAL_PATTERN_REPOSITORY,
  BehavioralPatternRepository,
} from '../../../domain/repositories/behavioral-pattern.repository';
import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  USER_BEHAVIOR_PROFILE_REPOSITORY,
  UserBehaviorProfileRepository,
} from '../../../domain/repositories/user-behavior-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { PersonalizationCalculatorService } from '../../services/personalization-calculator.service';
import {
  BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES,
  BuildUserBehaviorProfileError,
} from './build-user-behavior-profile.errors';
import { BuildUserBehaviorProfileInput } from './build-user-behavior-profile.input';
import { BuildUserBehaviorProfileOutput } from './build-user-behavior-profile.output';

const PERSONALIZATION_CALCULATOR_VERSION = 'personalization-engine-v1';

@Injectable()
export class BuildUserBehaviorProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    @Inject(BEHAVIORAL_PATTERN_REPOSITORY)
    private readonly behavioralPatternRepository: BehavioralPatternRepository,
    @Inject(USER_BEHAVIOR_PROFILE_REPOSITORY)
    private readonly userBehaviorProfileRepository: UserBehaviorProfileRepository,
    private readonly personalizationCalculatorService: PersonalizationCalculatorService,
  ) {}

  async execute(
    input: BuildUserBehaviorProfileInput,
  ): Promise<BuildUserBehaviorProfileOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildUserBehaviorProfileError(
        BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildUserBehaviorProfileError(
          BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const latestSnapshot =
        await this.personalizationSnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const behavioralPatterns =
        await this.behavioralPatternRepository.findManyByUserProfileId(
          userProfile.id,
        );
      const neutralCalculatorResult =
        this.personalizationCalculatorService.calculate({});

      const preferredCoachingStyle = latestSnapshot
        ? latestSnapshot.preferredCoachingStyle.value
        : behavioralPatterns.length > 0
          ? this.resolvePreferredCoachingStyleFromPatterns(behavioralPatterns)
          : neutralCalculatorResult.preferredCoachingStyle;
      const engagementProfile = latestSnapshot
        ? latestSnapshot.engagementProfile.value
        : behavioralPatterns.length > 0
          ? this.resolveEngagementProfileFromPatterns(behavioralPatterns)
          : neutralCalculatorResult.engagementProfile;
      const notificationResponsiveness = latestSnapshot
        ? latestSnapshot.notificationResponsiveness.value
        : neutralCalculatorResult.notificationResponsiveness;
      const goalResponsiveness = latestSnapshot
        ? latestSnapshot.goalResponsiveness.value
        : neutralCalculatorResult.goalResponsiveness;
      const recoveryResponsiveness = latestSnapshot
        ? latestSnapshot.recoveryResponsiveness.value
        : neutralCalculatorResult.recoveryResponsiveness;
      const habitResponsiveness = latestSnapshot
        ? latestSnapshot.habitResponsiveness.value
        : neutralCalculatorResult.habitResponsiveness;
      const riskOfDisengagement = latestSnapshot
        ? this.resolveRiskOfDisengagement(
            latestSnapshot.riskOfDisengagement.value,
            behavioralPatterns,
          )
        : this.resolveRiskOfDisengagement(
            neutralCalculatorResult.riskOfDisengagement,
            behavioralPatterns,
          );
      const formulaVersion =
        latestSnapshot?.formulaVersion ?? PERSONALIZATION_CALCULATOR_VERSION;

      const persistedProfile =
        await this.userBehaviorProfileRepository.upsertByUserProfileId({
          userProfileId: userProfile.id,
          preferredCoachingStyle,
          notificationResponsiveness,
          goalResponsiveness,
          recoveryResponsiveness,
          habitResponsiveness,
          engagementProfile,
          riskOfDisengagement,
          formulaVersion,
        });

      return {
        userBehaviorProfile: persistedProfile,
      };
    } catch (error) {
      if (error instanceof BuildUserBehaviorProfileError) {
        throw error;
      }

      throw new BuildUserBehaviorProfileError(
        BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private resolvePreferredCoachingStyleFromPatterns(
    patterns: Array<{ type: { value: string } | string }>,
  ): 'motivational' | 'direct' | 'educational' | 'balanced' {
    const types = patterns.map((pattern) =>
      typeof pattern.type === 'string' ? pattern.type : pattern.type.value,
    );

    if (types.includes('responds_to_recovery_guidance')) {
      return 'educational';
    }

    if (
      types.includes('high_dismissal_behavior') ||
      types.includes('ignores_low_priority_reminders')
    ) {
      return 'direct';
    }

    if (
      types.includes('responds_to_goals') ||
      types.includes('responds_to_streaks') ||
      types.includes('consistent_check_in_behavior')
    ) {
      return 'motivational';
    }

    return 'balanced';
  }

  private resolveEngagementProfileFromPatterns(
    patterns: Array<{ type: { value: string } | string }>,
  ): 'low' | 'medium' | 'high' {
    const types = patterns.map((pattern) =>
      typeof pattern.type === 'string' ? pattern.type : pattern.type.value,
    );

    const positivePatternCount = [
      'responds_to_streaks',
      'responds_to_goals',
      'responds_to_recovery_guidance',
      'responds_to_notifications',
      'consistent_check_in_behavior',
    ].filter((type) => types.includes(type)).length;

    if (positivePatternCount >= 3) {
      return 'high';
    }

    if (positivePatternCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  private resolveRiskOfDisengagement(
    fallback: 'low' | 'medium' | 'high',
    patterns: Array<{
      type: { value: string } | string;
      confidence: { value: 'low' | 'medium' | 'high' } | 'low' | 'medium' | 'high';
    }>,
  ): 'low' | 'medium' | 'high' {
    const hasHighDismissalPattern = patterns.some((pattern) => {
      const type =
        typeof pattern.type === 'string' ? pattern.type : pattern.type.value;
      const confidence =
        typeof pattern.confidence === 'string'
          ? pattern.confidence
          : pattern.confidence.value;

      return (
        (type === 'high_dismissal_behavior' ||
          type === 'ignores_low_priority_reminders') &&
        confidence === 'high'
      );
    });

    if (hasHighDismissalPattern) {
      return 'high';
    }

    if (patterns.length > 0 && fallback === 'low') {
      return 'medium';
    }

    return fallback;
  }
}
