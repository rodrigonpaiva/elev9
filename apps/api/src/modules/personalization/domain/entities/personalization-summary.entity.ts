import type { PersonalizationSummaryContract } from '../personalization.contract';
import { CoachingStyleValueObject } from '../value-objects/coaching-style.value-object';
import { EngagementProfileValueObject } from '../value-objects/engagement-profile.value-object';
import { PersonalizationTrendValueObject } from '../value-objects/personalization-trend.value-object';
import { ResponsivenessLevelValueObject } from '../value-objects/responsiveness-level.value-object';
import type { BehavioralPatternType } from '../personalization.types';

export type PersonalizationSummaryProps = {
  userProfileId: string;
  preferredCoachingStyle: CoachingStyleValueObject;
  engagementProfile: EngagementProfileValueObject;
  topPatterns: BehavioralPatternType[];
  riskOfDisengagement: ResponsivenessLevelValueObject;
  trend: PersonalizationTrendValueObject;
  formulaVersion: string;
  updatedAt?: Date;
};

export class PersonalizationSummary {
  readonly userProfileId: string;
  readonly preferredCoachingStyle: CoachingStyleValueObject;
  readonly engagementProfile: EngagementProfileValueObject;
  readonly topPatterns: BehavioralPatternType[];
  readonly riskOfDisengagement: ResponsivenessLevelValueObject;
  readonly trend: PersonalizationTrendValueObject;
  readonly formulaVersion: string;
  readonly updatedAt?: Date;

  constructor(props: PersonalizationSummaryProps) {
    this.userProfileId = props.userProfileId;
    this.preferredCoachingStyle = props.preferredCoachingStyle;
    this.engagementProfile = props.engagementProfile;
    this.topPatterns = props.topPatterns;
    this.riskOfDisengagement = props.riskOfDisengagement;
    this.trend = props.trend;
    this.formulaVersion = props.formulaVersion;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): PersonalizationSummaryContract {
    return {
      userProfileId: this.userProfileId,
      preferredCoachingStyle: this.preferredCoachingStyle.value,
      engagementProfile: this.engagementProfile.value,
      topPatterns: this.topPatterns,
      riskOfDisengagement: this.riskOfDisengagement.value,
      trend: this.trend.value,
      formulaVersion: this.formulaVersion,
      updatedAt: this.updatedAt?.toISOString(),
    };
  }
}
