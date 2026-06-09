import { UserBehaviorProfile } from '../entities/user-behavior-profile.entity';
import type {
  CoachingStyle,
  EngagementProfile,
  ResponsivenessLevel,
} from '../personalization.types';

export interface UpsertUserBehaviorProfileRepositoryInput {
  userProfileId: string;
  preferredCoachingStyle: CoachingStyle;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  engagementProfile: EngagementProfile;
  riskOfDisengagement: ResponsivenessLevel;
  formulaVersion: string;
}

export interface UserBehaviorProfileRepository {
  findByUserProfileId(
    userProfileId: string,
  ): Promise<UserBehaviorProfile | null>;
  upsertByUserProfileId(
    input: UpsertUserBehaviorProfileRepositoryInput,
  ): Promise<UserBehaviorProfile>;
}

export const USER_BEHAVIOR_PROFILE_REPOSITORY = Symbol(
  'USER_BEHAVIOR_PROFILE_REPOSITORY',
);
