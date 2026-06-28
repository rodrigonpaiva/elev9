export type NotificationType =
  | 'recovery_alert'
  | 'workout_reminder'
  | 'missed_workout'
  | 'goal_milestone'
  | 'goal_achievement'
  | 'weekly_summary'
  | 'coach_nudge'
  | 'nutrition_reminder';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus =
  | 'planned'
  | 'sent'
  | 'opened'
  | 'dismissed'
  | 'completed'
  | 'skipped';
export type NotificationChannel = 'in_app' | 'push' | 'email';
export type NotificationFatigueLevel = 'low' | 'medium' | 'high';
export type NotificationSuppressionReason =
  | 'daily_cap_reached'
  | 'same_type_cooldown'
  | 'high_dismissal_ratio'
  | 'already_engaged'
  | 'recent_notification';
export interface NotificationFatigueEvaluation {
  suppressed: boolean;
  fatigueLevel: NotificationFatigueLevel;
  reasons: NotificationSuppressionReason[];
}
export type EngagementEventType =
  | 'impression'
  | 'opened'
  | 'clicked'
  | 'dismissed'
  | 'completed';
export type NotificationInfluenceCode =
  | 'LOW_READINESS'
  | 'HIGH_FATIGUE'
  | 'MEDIUM_FATIGUE'
  | 'LOW_FATIGUE'
  | 'REST_DAY_RECOMMENDED'
  | 'GOAL_ACHIEVED'
  | 'GOAL_MILESTONE_CLOSE'
  | 'MISSED_WORKOUTS'
  | 'LOW_NUTRITION_ADHERENCE'
  | 'LOW_ENGAGEMENT'
  | 'COACH_CONSISTENCY_NUDGE';
export interface NotificationInfluence {
  code: NotificationInfluenceCode;
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  source: 'recovery' | 'goal' | 'activity' | 'nutrition' | 'coach';
  weight?: number;
  value?: number;
}
export interface NotificationSourceContext {
  coachDecisionId?: string;
  coachDecisionPriority?:
    | 'recovery'
    | 'nutrition'
    | 'training'
    | 'consistency'
    | 'motivation';
  coachDecisionHeadline?: string;
  readinessScore?: number;
  fatigueScore?: number;
  fatigueLevel?: NotificationFatigueLevel;
  adaptiveRecommendationType?: string;
  goalProgressTrend?: 'improving' | 'stable' | 'declining';
  goalMilestoneClose?: boolean;
  goalAchievementReached?: boolean;
  nutritionAdherence?: number;
  missedWorkouts?: number;
  noRecentActivity?: boolean;
  recentEngagementEventsCount?: number;
  formulaVersion: string;
  generatedAt?: string;
}
export interface NotificationDecision {
  id?: string;
  userProfileId: string;
  date: string;
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationInfluence[];
  sourceContext: NotificationSourceContext;
  suppressed?: boolean;
  suppressionReasons?: NotificationSuppressionReason[];
  fatigueLevel?: NotificationFatigueLevel;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt?: string;
  updatedAt?: string;
}
export interface GetTodayNotificationResponse {
  notificationDecision: NotificationDecision;
}
export interface GetCurrentNotificationResponse {
  notificationDecision: NotificationDecision;
}
export interface GetNotificationHistoryQuery {
  limit?: number;
}
export interface GetNotificationHistoryResponse {
  notificationDecisions: NotificationDecision[];
  limit: number;
}
export interface NotificationEngagementSummary {
  engagementScore: number;
  fatigueLevel: NotificationFatigueLevel;
  openedCount: number;
  clickedCount: number;
  dismissedCount: number;
  completedCount: number;
  recentEventsCount: number;
}
export interface GetEngagementSummaryResponse {
  engagementSummary: NotificationEngagementSummary;
}
export interface EngagementEvent {
  id: string;
  userProfileId: string;
  notificationDecisionId?: string;
  type: EngagementEventType;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
export interface NotificationHistoryEntry {
  id: string;
  userProfileId: string;
  notificationDecisionId: string;
  previousStatus?: NotificationStatus;
  nextStatus: NotificationStatus;
  reason?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}
export interface RecordEngagementEventRequest {
  type: EngagementEventType;
  metadata?: Record<string, unknown>;
}
export interface RecordEngagementEventResponse {
  engagementEvent: EngagementEvent;
  notificationDecision: NotificationDecision;
  historyEntry?: NotificationHistoryEntry;
}
export interface NotificationReplayDifference {
  field:
    | 'type'
    | 'priority'
    | 'channel'
    | 'status'
    | 'title'
    | 'message'
    | 'actionLabel'
    | 'actionTarget'
    | 'influences'
    | 'formulaVersion'
    | 'generatedBy';
  persisted: unknown;
  recalculated: unknown;
}
export interface NotificationReplayComparison {
  matches: boolean;
  differences: NotificationReplayDifference[];
}
export interface NotificationReplayRecalculatedDecision {
  type: NotificationType;
  priority: NotificationPriority;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationInfluence[];
  formulaVersion: string;
  generatedBy: 'deterministic';
}
export interface NotificationReplayResponse {
  persisted: NotificationDecision;
  recalculated: NotificationReplayRecalculatedDecision;
  comparison: NotificationReplayComparison;
  replayedAt: string;
}
