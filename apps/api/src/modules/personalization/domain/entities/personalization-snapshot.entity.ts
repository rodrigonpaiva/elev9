import type { PersonalizationSnapshotContract } from '../personalization.contract';
import type { PersonalizationSourceContext } from '../../../../shared/source-context';
import { CoachingStyleValueObject } from '../value-objects/coaching-style.value-object';
import { EngagementProfileValueObject } from '../value-objects/engagement-profile.value-object';
import { PersonalizationTrendValueObject } from '../value-objects/personalization-trend.value-object';
import { ResponsivenessLevelValueObject } from '../value-objects/responsiveness-level.value-object';

export type PersonalizationSnapshotProps = {
  id?: string;
  userProfileId: string;
  date: string;
  preferredCoachingStyle: CoachingStyleValueObject;
  engagementProfile: EngagementProfileValueObject;
  notificationResponsiveness: ResponsivenessLevelValueObject;
  goalResponsiveness: ResponsivenessLevelValueObject;
  recoveryResponsiveness: ResponsivenessLevelValueObject;
  habitResponsiveness: ResponsivenessLevelValueObject;
  riskOfDisengagement: ResponsivenessLevelValueObject;
  trend: PersonalizationTrendValueObject;
  sourceContext: PersonalizationSourceContext;
  formulaVersion: string;
  generatedAt: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class PersonalizationSnapshot {
  readonly id?: string;
  readonly userProfileId: string;
  readonly date: string;
  readonly preferredCoachingStyle: CoachingStyleValueObject;
  readonly engagementProfile: EngagementProfileValueObject;
  readonly notificationResponsiveness: ResponsivenessLevelValueObject;
  readonly goalResponsiveness: ResponsivenessLevelValueObject;
  readonly recoveryResponsiveness: ResponsivenessLevelValueObject;
  readonly habitResponsiveness: ResponsivenessLevelValueObject;
  readonly riskOfDisengagement: ResponsivenessLevelValueObject;
  readonly trend: PersonalizationTrendValueObject;
  readonly sourceContext: PersonalizationSourceContext;
  readonly formulaVersion: string;
  readonly generatedAt: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: PersonalizationSnapshotProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.preferredCoachingStyle = props.preferredCoachingStyle;
    this.engagementProfile = props.engagementProfile;
    this.notificationResponsiveness = props.notificationResponsiveness;
    this.goalResponsiveness = props.goalResponsiveness;
    this.recoveryResponsiveness = props.recoveryResponsiveness;
    this.habitResponsiveness = props.habitResponsiveness;
    this.riskOfDisengagement = props.riskOfDisengagement;
    this.trend = props.trend;
    this.sourceContext = props.sourceContext;
    this.formulaVersion = props.formulaVersion;
    this.generatedAt = props.generatedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): PersonalizationSnapshotContract {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      date: this.date,
      preferredCoachingStyle: this.preferredCoachingStyle.value,
      engagementProfile: this.engagementProfile.value,
      notificationResponsiveness: this.notificationResponsiveness.value,
      goalResponsiveness: this.goalResponsiveness.value,
      recoveryResponsiveness: this.recoveryResponsiveness.value,
      habitResponsiveness: this.habitResponsiveness.value,
      riskOfDisengagement: this.riskOfDisengagement.value,
      trend: this.trend.value,
      sourceContext: this.sourceContext,
      formulaVersion: this.formulaVersion,
      generatedAt: this.generatedAt,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }
}
