import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  NotificationDecision,
  NotificationEngagementSummary,
} from '@elev9/types';
import { formatNotificationStatus, formatNotificationType } from '@elev9/ui';

import { apiClient } from '../api/client';
import { isCoachOptionalEmptyState } from './coach';

export type CoachNotificationTarget =
  | 'coach-home'
  | 'coach-chat'
  | 'coach-insights'
  | 'coach-goal-guidance'
  | 'coach-daily-briefing'
  | 'coach-weekly-review'
  | 'coach-memory-timeline'
  | 'ask-coach'
  | 'workout'
  | 'nutrition'
  | 'recovery'
  | 'dashboard'
  | 'unknown';

export type CoachNotificationAction = {
  label: string;
  target: CoachNotificationTarget;
  isEnabled: boolean;
};

export type CoachNotificationToday = {
  id: string;
  typeLabel: string;
  title: string;
  reason: string;
  recommendedTime: string;
  statusLabel: string;
  action: CoachNotificationAction;
  dismissLabel: string;
  isSuppressed: boolean;
  accessibilityLabel: string;
  notificationId: string | null;
};

export type CoachNotificationUpcoming = {
  id: string;
  label: string;
  title: string;
  detail: string;
  statusLabel: string;
  recommendedTime: string;
  notificationId: string | null;
  target: CoachNotificationTarget;
};

export type CoachNotificationHistoryItem = {
  id: string;
  dateLabel: string;
  title: string;
  detail: string;
  typeLabel: string;
  statusLabel: string;
  actionLabel: string;
  target: CoachNotificationTarget;
  notificationId: string | null;
  accessibilityLabel: string;
};

export type CoachNotificationPreference = {
  id: 'training' | 'nutrition' | 'recovery' | 'weekly-review';
  label: string;
  detail: string;
};

export type CoachNotificationQuietMode = {
  label: string;
  detail: string;
  badgeLabel: string;
  isActive: boolean;
};

export type CoachNotificationQuickAction = {
  id: 'coach-home' | 'briefing' | 'weekly-review' | 'goals' | 'dashboard';
  label: string;
  target: CoachNotificationTarget;
  isEnabled: boolean;
};

export type CoachNotificationsModel = {
  heroSubtitle: string;
  today: CoachNotificationToday | null;
  upcoming: CoachNotificationUpcoming[];
  history: CoachNotificationHistoryItem[];
  preferences: CoachNotificationPreference[];
  quietMode: CoachNotificationQuietMode;
  quickActions: CoachNotificationQuickAction[];
  accessibilityLabel: string;
};

export type CoachNotificationsResult = {
  model: CoachNotificationsModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
};

type CoachNotificationsState = {
  currentNotification: NotificationDecision | null;
  history: NotificationDecision[];
  engagementSummary: NotificationEngagementSummary | null;
};

const INITIAL_STATE: CoachNotificationsState = {
  currentNotification: null,
  history: [],
  engagementSummary: null,
};

export function useCoachNotifications(): CoachNotificationsResult {
  const [state, setState] = useState<CoachNotificationsState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    const [currentResult, todayResult, historyResult, summaryResult] =
      await Promise.allSettled([
        apiClient.notifications.getCurrentNotification(),
        apiClient.notifications.getTodayNotification(),
        apiClient.notifications.getNotificationHistory({ limit: 12 }),
        apiClient.notifications.getEngagementSummary(),
      ]);

    const currentReason =
      currentResult.status === 'rejected' ? currentResult.reason : null;
    const todayReason =
      todayResult.status === 'rejected' ? todayResult.reason : null;

    const currentNotification =
      currentResult.status === 'fulfilled'
        ? currentResult.value.notificationDecision
        : todayResult.status === 'fulfilled'
          ? todayResult.value.notificationDecision
          : null;

    const history =
      historyResult.status === 'fulfilled'
        ? historyResult.value.notificationDecisions
        : [];

    const engagementSummary =
      summaryResult.status === 'fulfilled'
        ? summaryResult.value.engagementSummary
        : null;

    const results = [currentResult, todayResult, historyResult, summaryResult];

    if (
      results.every((result) => result.status === 'rejected') &&
      !isCoachOptionalEmptyState(currentReason, ['NOTIFICATION_NOT_FOUND']) &&
      !isCoachOptionalEmptyState(todayReason, ['NOTIFICATION_NOT_FOUND'])
    ) {
      setState(INITIAL_STATE);
      setErrorMessage('Unable to load smart nudges.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setState({
      currentNotification,
      history,
      engagementSummary,
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const model = useMemo(
    () => buildCoachNotificationsModel(state, hasSignals),
    [hasSignals, state],
  );

  const hasSignals =
    Boolean(state.currentNotification) ||
    state.history.length > 0 ||
    (Boolean(state.engagementSummary) &&
      (Boolean(state.engagementSummary?.openedCount) ||
        Boolean(state.engagementSummary?.clickedCount) ||
        Boolean(state.engagementSummary?.dismissedCount) ||
        Boolean(state.engagementSummary?.completedCount) ||
        Boolean(state.engagementSummary?.recentEventsCount)));

  return {
    model,
    isLoading,
    isRefreshing,
    errorMessage,
    isEmpty: !isLoading && !model && !errorMessage && !hasSignals,
    refresh: useCallback(async () => {
      await load({ refresh: true });
    }, [load]),
  };
}

function buildCoachNotificationsModel(
  state: CoachNotificationsState,
  hasSignals: boolean,
): CoachNotificationsModel | null {
  const heroSubtitle = getHeroSubtitle(state.engagementSummary);
  const today = buildTodayNudge(state.currentNotification);
  const upcoming = buildUpcomingNudges(state.currentNotification);
  const history = buildHistoryItems(state.history);
  const preferences = buildPreferences(state.currentNotification);
  const quietMode = buildQuietMode(
    state.engagementSummary,
    state.currentNotification,
  );
  const quickActions = buildQuickActions();

  if (!hasSignals) {
    return null;
  }

  return {
    heroSubtitle,
    today,
    upcoming,
    history,
    preferences,
    quietMode,
    quickActions,
    accessibilityLabel: buildAccessibilityLabel({
      heroSubtitle,
      today,
      history,
    }),
  };
}

function buildTodayNudge(
  notification: NotificationDecision | null,
): CoachNotificationToday | null {
  if (!notification) {
    return null;
  }

  const action = resolveAction(notification);
  const isSuppressed = Boolean(notification.suppressed);

  if (isSuppressed) {
    return {
      id: notification.id ?? `today-${notification.date}`,
      typeLabel: formatNotificationType(notification.type),
      title: 'No smart nudge right now.',
      reason:
        'Your coach is keeping reminders light based on recent engagement.',
      recommendedTime: 'Today',
      statusLabel: 'Quiet mode',
      action: {
        label: 'Open Coach Home',
        target: 'coach-home',
        isEnabled: true,
      },
      dismissLabel: 'Keep it quiet',
      isSuppressed: true,
      accessibilityLabel:
        'Smart nudge. No smart nudge right now. Your coach is keeping reminders light based on recent engagement.',
      notificationId: notification.id ?? null,
    };
  }

  return {
    id: notification.id ?? `today-${notification.date}`,
    typeLabel: formatNotificationType(notification.type),
    title: notification.title,
    reason: notification.message,
    recommendedTime: resolveRecommendedTime(notification),
    statusLabel: formatNotificationStatus(notification.status),
    action,
    dismissLabel: 'Not now',
    isSuppressed: false,
    accessibilityLabel: `Smart nudge. ${notification.title}. ${notification.message}. Recommended ${resolveRecommendedTime(notification)}.`,
    notificationId: notification.id ?? null,
  };
}

function buildUpcomingNudges(
  notification: NotificationDecision | null,
): CoachNotificationUpcoming[] {
  if (!notification || notification.suppressed) {
    return [];
  }

  if (notification.status !== 'planned' && notification.status !== 'sent') {
    return [];
  }

  return [
    {
      id: notification.id ?? `upcoming-${notification.date}`,
      label: 'Today',
      title: notification.title,
      detail: notification.message,
      statusLabel: formatNotificationStatus(notification.status),
      recommendedTime: resolveRecommendedTime(notification),
      notificationId: notification.id ?? null,
      target: resolveTarget(notification),
    },
  ];
}

function buildHistoryItems(
  notifications: NotificationDecision[],
): CoachNotificationHistoryItem[] {
  return notifications.slice(0, 8).map((notification) => {
    const target = resolveTarget(notification);
    const actionLabel = resolveActionLabel(notification);

    return {
      id: notification.id ?? `${notification.date}-${notification.type}`,
      dateLabel: formatNotificationDate(notification),
      title: notification.title,
      detail: notification.message,
      typeLabel: formatNotificationType(notification.type),
      statusLabel: formatNotificationStatus(notification.status),
      actionLabel,
      target,
      notificationId: notification.id ?? null,
      accessibilityLabel: `${formatNotificationType(notification.type)}. ${formatNotificationDate(notification)}. ${notification.title}. ${notification.message}. Status ${formatNotificationStatus(notification.status)}.`,
    };
  });
}

function buildPreferences(
  notification: NotificationDecision | null,
): CoachNotificationPreference[] {
  const category = notification?.sourceContext.coachDecisionPriority ?? null;

  return [
    {
      id: 'training',
      label: 'Training reminders',
      detail:
        category === 'training'
          ? 'The coach will nudge training when it matters most.'
          : 'Read only. Training reminders stay tied to today’s context.',
    },
    {
      id: 'nutrition',
      label: 'Nutrition reminders',
      detail:
        category === 'nutrition'
          ? 'Meal reminders are shaped around your current nutrition focus.'
          : 'Read only. Nutrition reminders adapt to meal timing and logging.',
    },
    {
      id: 'recovery',
      label: 'Recovery reminders',
      detail:
        category === 'recovery'
          ? 'Recovery nudges stay lighter when fatigue is elevated.'
          : 'Read only. Recovery reminders stay tied to readiness signals.',
    },
    {
      id: 'weekly-review',
      label: 'Weekly review',
      detail: 'Read only. Weekly reminders are reserved for the right moment.',
    },
  ];
}

function buildQuietMode(
  summary: NotificationEngagementSummary | null,
  notification: NotificationDecision | null,
): CoachNotificationQuietMode {
  if (notification?.suppressed) {
    return {
      label: 'Quiet mode',
      badgeLabel: 'On',
      isActive: true,
      detail:
        'Your coach is holding back reminders to avoid noise and preserve trust.',
    };
  }

  if (!summary) {
    return {
      label: 'Quiet mode',
      badgeLabel: 'Adaptive',
      isActive: false,
      detail:
        'The coach keeps reminders respectful and only sends them when timing is useful.',
    };
  }

  if (summary.fatigueLevel === 'high') {
    return {
      label: 'Quiet mode',
      badgeLabel: 'On',
      isActive: true,
      detail:
        'The coach is keeping reminders light while your engagement patterns settle.',
    };
  }

  if (summary.fatigueLevel === 'medium') {
    return {
      label: 'Quiet mode',
      badgeLabel: 'Adaptive',
      isActive: false,
      detail:
        'The coach is balancing helpful reminders with your recent engagement.',
    };
  }

  return {
    label: 'Quiet mode',
    badgeLabel: 'Light',
    isActive: false,
    detail:
      'The coach will only surface a nudge when it can create clear value.',
  };
}

function buildQuickActions(): CoachNotificationQuickAction[] {
  return [
    {
      id: 'coach-home',
      label: 'Open Coach',
      target: 'coach-home',
      isEnabled: true,
    },
    {
      id: 'briefing',
      label: "Today's Briefing",
      target: 'coach-daily-briefing',
      isEnabled: true,
    },
    {
      id: 'weekly-review',
      label: 'Weekly Review',
      target: 'coach-weekly-review',
      isEnabled: true,
    },
    {
      id: 'goals',
      label: 'Goal Guidance',
      target: 'coach-goal-guidance',
      isEnabled: true,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      target: 'dashboard',
      isEnabled: true,
    },
  ];
}

function resolveAction(
  notification: NotificationDecision,
): CoachNotificationAction {
  const target = resolveTarget(notification);
  const label = resolveActionLabel(notification);

  return {
    label,
    target,
    isEnabled: true,
  };
}

function resolveActionLabel(notification: NotificationDecision): string {
  if (notification.actionLabel?.trim()) {
    return notification.actionLabel.trim();
  }

  switch (resolveTarget(notification)) {
    case 'coach-chat':
      return 'Open Coach Conversation';
    case 'coach-daily-briefing':
      return "Today's Briefing";
    case 'coach-weekly-review':
      return 'Weekly Review';
    case 'coach-goal-guidance':
      return 'Goal Guidance';
    case 'coach-memory-timeline':
      return 'Coach Memory';
    case 'coach-insights':
      return 'Learn More';
    case 'workout':
      return 'View Workout';
    case 'nutrition':
      return 'View Nutrition';
    case 'recovery':
      return 'Open Recovery';
    case 'dashboard':
      return 'Open Dashboard';
    case 'coach-home':
      return 'Open Coach Home';
    case 'ask-coach':
      return 'Ask Coach';
    case 'unknown':
    default:
      return 'Open Coach Home';
  }
}

function resolveTarget(
  notification: NotificationDecision,
): CoachNotificationTarget {
  const target = notification.actionTarget?.trim().toLowerCase();

  switch (target) {
    case 'coach':
    case 'conversation':
    case 'coachchat':
      return 'coach-chat';
    case 'coachhome':
    case 'home':
      return 'coach-home';
    case 'insight':
    case 'insights':
      return 'coach-insights';
    case 'coachgoalguidance':
    case 'goal-guidance':
    case 'goals':
      return 'coach-goal-guidance';
    case 'coachdailybriefing':
    case 'briefing':
      return 'coach-daily-briefing';
    case 'coachweeklyreview':
    case 'weekly-review':
      return 'coach-weekly-review';
    case 'coachmemory':
    case 'memory':
      return 'coach-memory-timeline';
    case 'ask':
    case 'askcoach':
      return 'ask-coach';
    case 'workout':
      return 'workout';
    case 'nutrition':
      return 'nutrition';
    case 'recovery':
      return 'recovery';
    case 'dashboard':
      return 'dashboard';
    default:
      return 'unknown';
  }
}

function getHeroSubtitle(
  summary: NotificationEngagementSummary | null,
): string {
  if (!summary) {
    return 'Your coach will only remind you when it matters.';
  }

  if (summary.fatigueLevel === 'high') {
    return 'Your coach is keeping nudges light today.';
  }

  if (summary.fatigueLevel === 'medium') {
    return 'Supportive reminders are balanced with your recent engagement.';
  }

  return 'Supportive reminders based on your training, nutrition and recovery.';
}

function formatNotificationDate(notification: NotificationDecision): string {
  const value =
    notification.createdAt ??
    notification.updatedAt ??
    notification.sourceContext.generatedAt ??
    notification.date;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (sameYesterday) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function resolveRecommendedTime(notification: NotificationDecision): string {
  const value =
    notification.sourceContext.generatedAt ??
    notification.updatedAt ??
    notification.createdAt ??
    notification.date;
  const date = new Date(value);

  if (Number.isNaN(date.getTime()) || !String(value).includes('T')) {
    return 'Today';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function buildAccessibilityLabel(input: {
  heroSubtitle: string;
  today: CoachNotificationToday | null;
  history: CoachNotificationHistoryItem[];
}): string {
  const pieces = ['Smart Nudges', input.heroSubtitle];

  if (input.today) {
    pieces.push(input.today.accessibilityLabel);
  }

  if (input.history.length > 0) {
    pieces.push(`${input.history.length} history items available.`);
  }

  return pieces.join(' ');
}

export function trackCoachNotificationsEvent(
  _event:
    | 'coach_notifications_opened'
    | 'coach_nudge_selected'
    | 'coach_nudge_dismissed'
    | 'coach_notification_history_opened'
    | 'coach_quiet_mode_viewed',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
