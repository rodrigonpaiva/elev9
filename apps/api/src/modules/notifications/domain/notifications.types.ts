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
  | 'recent_notification'
  | 'low_personalization_responsiveness';

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

export type NotificationInfluenceImpact = 'positive' | 'negative' | 'neutral';

export type NotificationInfluenceSource =
  | 'recovery'
  | 'goal'
  | 'activity'
  | 'nutrition'
  | 'coach';

export type NotificationCoachDecisionPriority =
  | 'recovery'
  | 'nutrition'
  | 'training'
  | 'consistency'
  | 'motivation';

export interface NotificationSourceContext {
  coachDecisionId?: string;
  coachDecisionPriority?: NotificationCoachDecisionPriority;
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

export interface NotificationDecisionLifecycleProps {
  suppressed?: boolean;
  suppressionReasons?: NotificationSuppressionReason[];
  fatigueLevel?: NotificationFatigueLevel;
}

export interface NotificationInfluenceProps {
  code: NotificationInfluenceCode;
  label: string;
  impact: NotificationInfluenceImpact;
  source: NotificationInfluenceSource;
  weight?: number;
  value?: number;
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
  influences: NotificationInfluenceProps[];
  sourceContext: NotificationSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt?: string;
  updatedAt?: string;
}
