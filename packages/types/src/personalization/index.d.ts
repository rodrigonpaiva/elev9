export type CoachingStyle =
  | 'motivational'
  | 'direct'
  | 'educational'
  | 'balanced';
export type EngagementProfile = 'low' | 'medium' | 'high';
export type ResponsivenessLevel = 'low' | 'medium' | 'high';
export type BehavioralPatternType =
  | 'responds_to_streaks'
  | 'responds_to_goals'
  | 'responds_to_recovery_guidance'
  | 'responds_to_notifications'
  | 'ignores_low_priority_reminders'
  | 'morning_engagement'
  | 'evening_engagement'
  | 'high_dismissal_behavior'
  | 'consistent_check_in_behavior';
export type PersonalizationTrend = 'improving' | 'stable' | 'declining';
export interface PersonalizationSourceContext {
  formulaVersion: string;
  generatedAt: string;
  engagementScore?: number;
  notificationDismissalRate?: number;
  notificationCompletionRate?: number;
  consistencyScore?: number;
  habitTrend?: PersonalizationTrend;
  habitRiskLevel?: 'low' | 'medium' | 'high';
  goalTrend?: PersonalizationTrend;
  goalMilestoneReached?: boolean;
  goalAchievementReached?: boolean;
  recoveryTrend?: PersonalizationTrend;
  recoveryAlertEngagement?: number;
  coachDecisionPriorityHistory?: string[];
  activityHourDistribution?: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  previousSnapshotScore?: number;
}
export interface UserBehaviorProfile {
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
export interface BehavioralPattern {
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
export interface PersonalizationSnapshot {
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
export interface PersonalizationSummary {
  userProfileId: string;
  preferredCoachingStyle: CoachingStyle;
  engagementProfile: EngagementProfile;
  topPatterns: BehavioralPatternType[];
  riskOfDisengagement: ResponsivenessLevel;
  trend: PersonalizationTrend;
  formulaVersion: string;
  updatedAt?: string;
}
export interface GetTodayPersonalizationResponse {
  personalizationSnapshot: PersonalizationSnapshot;
}
export interface GetCurrentPersonalizationResponse {
  personalizationSnapshot: PersonalizationSnapshot;
}
export interface GetPersonalizationHistoryQuery {
  limit?: number;
}
export interface GetPersonalizationHistoryResponse {
  personalizationSnapshots: PersonalizationSnapshot[];
  limit: number;
}
export interface GetBehavioralPatternsResponse {
  behavioralPatterns: BehavioralPattern[];
}
export interface GetUserBehaviorProfileResponse {
  userBehaviorProfile: UserBehaviorProfile;
}
export type PersonalizationReplayComparisonField =
  | 'preferredCoachingStyle'
  | 'engagementProfile'
  | 'notificationResponsiveness'
  | 'goalResponsiveness'
  | 'recoveryResponsiveness'
  | 'habitResponsiveness'
  | 'riskOfDisengagement'
  | 'trend'
  | 'formulaVersion';
export interface PersonalizationReplayDifference {
  field: PersonalizationReplayComparisonField;
  persisted: unknown;
  recalculated: unknown;
}
export interface PersonalizationReplayComparison {
  matches: boolean;
  differences: PersonalizationReplayDifference[];
}
export interface PersonalizationReplayRecalculatedSnapshot {
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
export interface PersonalizationReplayResponse {
  persisted: PersonalizationSnapshot;
  recalculated: PersonalizationReplayRecalculatedSnapshot;
  comparison: PersonalizationReplayComparison;
  replayedAt: string;
}
