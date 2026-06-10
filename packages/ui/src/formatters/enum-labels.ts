const GOAL_TYPE_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  gain_muscle: 'Gain muscle',
  maintain: 'Maintain',
  maintain_weight: 'Maintain weight',
  improve_consistency: 'Improve consistency',
  improve_recovery: 'Improve recovery',
};

const GOAL_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  in_progress: 'In progress',
  achieved: 'Achieved',
  abandoned: 'Abandoned',
};

const TREND_LABELS: Record<string, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
  needs_recovery: 'Needs recovery',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const TRAINING_RECOMMENDATION_LABELS: Record<string, string> = {
  rest_day: 'Rest day',
  normal: 'Normal training',
  reduce_intensity: 'Reduce intensity',
  increase_intensity: 'Increase intensity',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  recovery_alert: 'Recovery alert',
  goal_milestone: 'Goal milestone',
  goal_achievement: 'Goal achieved',
  missed_workout: 'Missed workout',
  workout_reminder: 'Workout reminder',
  nutrition_reminder: 'Nutrition reminder',
  coach_nudge: 'Coach nudge',
  weekly_summary: 'Weekly summary',
};

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  sent: 'Sent',
  opened: 'Opened',
  dismissed: 'Dismissed',
  completed: 'Completed',
  skipped: 'Skipped',
};

const COACHING_STYLE_LABELS: Record<string, string> = {
  direct: 'Direct',
  motivational: 'Motivational',
  educational: 'Educational',
  balanced: 'Balanced',
};

const ENGAGEMENT_PROFILE_LABELS: Record<string, string> = {
  highly_engaged: 'Highly engaged',
  moderately_engaged: 'Moderately engaged',
  low_engagement: 'Low engagement',
};

export function formatGoalType(value: string): string {
  return GOAL_TYPE_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatGoalStatus(value: string): string {
  return GOAL_STATUS_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatTrend(value: string): string {
  return TREND_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatRiskLevel(value: string): string {
  return RISK_LEVEL_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatTrainingRecommendation(value: string): string {
  return (
    TRAINING_RECOMMENDATION_LABELS[value] ?? formatGenericEnumLabel(value)
  );
}

export function formatNotificationType(value: string): string {
  return NOTIFICATION_TYPE_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatNotificationStatus(value: string): string {
  return NOTIFICATION_STATUS_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatCoachingStyle(value: string): string {
  return COACHING_STYLE_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatEngagementProfile(value: string): string {
  return ENGAGEMENT_PROFILE_LABELS[value] ?? formatGenericEnumLabel(value);
}

export function formatGenericEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
