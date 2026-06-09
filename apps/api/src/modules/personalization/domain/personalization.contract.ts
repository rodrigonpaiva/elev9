import type {
  BehavioralPatternType,
  CoachingStyle,
  EngagementProfile,
  PersonalizationTrend,
  ResponsivenessLevel,
} from './personalization.types';
import type { PersonalizationSourceContext } from '../../../shared/source-context';

export interface UserBehaviorProfileContract {
  id?: string;
  userProfileId: string;
  preferredCoachingStyle: CoachingStyle;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  engagementProfile: EngagementProfile;
  riskOfDisengagement: ResponsivenessLevel;
  formulaVersion: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface BehavioralPatternContract {
  id?: string;
  userProfileId: string;
  type: BehavioralPatternType;
  confidence: ResponsivenessLevel;
  evidenceCount: number;
  lastObservedAt: string;
  formulaVersion: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalizationSnapshotContract {
  id?: string;
  userProfileId: string;
  date: string;
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  riskOfDisengagement: ResponsivenessLevel;
  trend: PersonalizationTrend;
  sourceContext: PersonalizationSourceContext;
  formulaVersion: string;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalizationSummaryContract {
  userProfileId: string;
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  topPatterns: BehavioralPatternType[];
  riskOfDisengagement: ResponsivenessLevel;
  trend: PersonalizationTrend;
  formulaVersion: string;
  updatedAt?: string;
}

export interface PersonalizationReplayDifferenceContract {
  field:
    | 'preferredCoachingStyle'
    | 'engagementProfile'
    | 'notificationResponsiveness'
    | 'goalResponsiveness'
    | 'recoveryResponsiveness'
    | 'habitResponsiveness'
    | 'riskOfDisengagement'
    | 'trend'
    | 'formulaVersion';
  persisted: unknown;
  recalculated: unknown;
}

export interface PersonalizationReplayComparisonContract {
  matches: boolean;
  differences: PersonalizationReplayDifferenceContract[];
}

export interface PersonalizationReplayRecalculatedSnapshotContract {
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  notificationResponsiveness: ResponsivenessLevel;
  goalResponsiveness: ResponsivenessLevel;
  recoveryResponsiveness: ResponsivenessLevel;
  habitResponsiveness: ResponsivenessLevel;
  riskOfDisengagement: ResponsivenessLevel;
  trend: PersonalizationTrend;
  formulaVersion: string;
}

export interface PersonalizationReplayResponseContract {
  persisted: PersonalizationSnapshotContract;
  recalculated: PersonalizationReplayRecalculatedSnapshotContract;
  comparison: PersonalizationReplayComparisonContract;
  replayedAt: string;
}
