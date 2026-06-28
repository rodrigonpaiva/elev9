import type { UserBehaviorProfileContract } from '../personalization.contract';
import { CoachingStyleValueObject } from '../value-objects/coaching-style.value-object';
import { EngagementProfileValueObject } from '../value-objects/engagement-profile.value-object';
import { ResponsivenessLevelValueObject } from '../value-objects/responsiveness-level.value-object';

export type UserBehaviorProfileProps = {
  id?: string;
  userProfileId: string;
  preferredCoachingStyle: CoachingStyleValueObject;
  notificationResponsiveness: ResponsivenessLevelValueObject;
  goalResponsiveness: ResponsivenessLevelValueObject;
  recoveryResponsiveness: ResponsivenessLevelValueObject;
  habitResponsiveness: ResponsivenessLevelValueObject;
  engagementProfile: EngagementProfileValueObject;
  riskOfDisengagement: ResponsivenessLevelValueObject;
  formulaVersion: string;
  updatedAt?: Date;
  createdAt?: Date;
};

export class UserBehaviorProfile {
  readonly id?: string;
  readonly userProfileId: string;
  readonly preferredCoachingStyle: CoachingStyleValueObject;
  readonly notificationResponsiveness: ResponsivenessLevelValueObject;
  readonly goalResponsiveness: ResponsivenessLevelValueObject;
  readonly recoveryResponsiveness: ResponsivenessLevelValueObject;
  readonly habitResponsiveness: ResponsivenessLevelValueObject;
  readonly engagementProfile: EngagementProfileValueObject;
  readonly riskOfDisengagement: ResponsivenessLevelValueObject;
  readonly formulaVersion: string;
  readonly updatedAt?: Date;
  readonly createdAt?: Date;

  constructor(props: UserBehaviorProfileProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.preferredCoachingStyle = props.preferredCoachingStyle;
    this.notificationResponsiveness = props.notificationResponsiveness;
    this.goalResponsiveness = props.goalResponsiveness;
    this.recoveryResponsiveness = props.recoveryResponsiveness;
    this.habitResponsiveness = props.habitResponsiveness;
    this.engagementProfile = props.engagementProfile;
    this.riskOfDisengagement = props.riskOfDisengagement;
    this.formulaVersion = props.formulaVersion;
    this.updatedAt = props.updatedAt;
    this.createdAt = props.createdAt;
  }

  toJSON(): UserBehaviorProfileContract {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      preferredCoachingStyle: this.preferredCoachingStyle.value,
      notificationResponsiveness: this.notificationResponsiveness.value,
      goalResponsiveness: this.goalResponsiveness.value,
      recoveryResponsiveness: this.recoveryResponsiveness.value,
      habitResponsiveness: this.habitResponsiveness.value,
      engagementProfile: this.engagementProfile.value,
      riskOfDisengagement: this.riskOfDisengagement.value,
      formulaVersion: this.formulaVersion,
      updatedAt: this.updatedAt?.toISOString(),
      createdAt: this.createdAt?.toISOString(),
    };
  }
}
