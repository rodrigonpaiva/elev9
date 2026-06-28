import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type {
  BehavioralPattern,
  CoachChatHistoryMessage,
  ConsistencySummary,
  GoalProgressSnapshot,
  HabitSnapshot,
  PersonalizationSnapshot,
  ProgressSummaryResponse,
} from '@elev9/types';

import { apiClient } from '../api/client';

export type CoachMemoryTarget =
  | 'insight'
  | 'conversation'
  | 'weekly-review'
  | 'workout-history'
  | 'nutrition-history'
  | 'recovery'
  | 'goals'
  | 'dashboard';

export type CoachMemoryItem = {
  id: string;
  dateLabel: string;
  title: string;
  explanation: string;
  icon: 'sparkles' | 'barbell' | 'nutrition' | 'recovery' | 'goal' | 'habit';
  target?: CoachMemoryTarget;
};

export type CoachMemoryPattern = {
  id: string;
  pattern: string;
  confidence: string;
  whyItMatters: string;
  target?: CoachMemoryTarget;
};

export type CoachGrowthMoment = {
  id: string;
  title: string;
  detail: string;
};

export type CoachMemoryQuickAction = {
  id: 'insight' | 'conversation' | 'weekly-review' | 'goals' | 'dashboard';
  label: string;
  target: CoachMemoryTarget;
  isEnabled: boolean;
};

export type CoachMemoryTimelineModel = {
  subtitle: string;
  memories: CoachMemoryItem[];
  patterns: CoachMemoryPattern[];
  growthMoments: CoachGrowthMoment[];
  reflection: string;
  quickActions: CoachMemoryQuickAction[];
  accessibilityLabel: string;
};

export type CoachMemoryTimelineResult = {
  model: CoachMemoryTimelineModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
};

type MemoryState = {
  chatMessages: CoachChatHistoryMessage[];
  personalizationHistory: PersonalizationSnapshot[];
  behavioralPatterns: BehavioralPattern[];
  habitHistory: HabitSnapshot[];
  consistencySummary: ConsistencySummary | null;
  goalHistory: GoalProgressSnapshot[];
  progressSummary: ProgressSummaryResponse['summary'] | null;
};

const INITIAL_STATE: MemoryState = {
  chatMessages: [],
  personalizationHistory: [],
  behavioralPatterns: [],
  habitHistory: [],
  consistencySummary: null,
  goalHistory: [],
  progressSummary: null,
};

export function useCoachMemoryTimeline(): CoachMemoryTimelineResult {
  const [state, setState] = useState<MemoryState>(INITIAL_STATE);
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

    const [
      chatResult,
      personalizationResult,
      patternsResult,
      habitResult,
      summaryResult,
      goalResult,
      progressResult,
    ] = await Promise.allSettled([
      apiClient.ai.getChatHistory({ limit: 20 }),
      apiClient.personalization.getPersonalizationHistory({ limit: 14 }),
      apiClient.personalization.getBehavioralPatterns(),
      apiClient.habits.getHabitHistory({ limit: 14 }),
      apiClient.habits.getConsistencySummary(),
      apiClient.goals.getGoalHistory({ limit: 14 }),
      apiClient.progress.getSummary('week'),
    ]);

    if (
      [
        chatResult,
        personalizationResult,
        patternsResult,
        habitResult,
        summaryResult,
        goalResult,
        progressResult,
      ].every((result) => result.status === 'rejected') &&
      !isOptionalEmptyState(chatResult.reason)
    ) {
      setErrorMessage('Unable to load coach memories.');
      setState(INITIAL_STATE);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setState({
      chatMessages: chatResult.status === 'fulfilled' ? chatResult.value : [],
      personalizationHistory:
        personalizationResult.status === 'fulfilled'
          ? personalizationResult.value.personalizationSnapshots
          : [],
      behavioralPatterns:
        patternsResult.status === 'fulfilled'
          ? patternsResult.value.behavioralPatterns
          : [],
      habitHistory:
        habitResult.status === 'fulfilled'
          ? habitResult.value.habitSnapshots
          : [],
      consistencySummary:
        summaryResult.status === 'fulfilled'
          ? summaryResult.value.consistencySummary
          : null,
      goalHistory:
        goalResult.status === 'fulfilled'
          ? goalResult.value.goalProgressSnapshots
          : [],
      progressSummary:
        progressResult.status === 'fulfilled'
          ? progressResult.value.summary
          : null,
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const model = useMemo(() => buildMemoryModel(state), [state]);
  const hasMemorySignals =
    state.chatMessages.length > 0 ||
    state.personalizationHistory.length > 0 ||
    state.behavioralPatterns.length > 0 ||
    state.habitHistory.length > 0 ||
    state.goalHistory.length > 0 ||
    Boolean(state.consistencySummary) ||
    Boolean(state.progressSummary);

  return {
    model,
    isLoading,
    isRefreshing,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && !model && !hasMemorySignals,
    refresh: () => load({ refresh: true }),
  };
}

function buildMemoryModel(state: MemoryState): CoachMemoryTimelineModel | null {
  const memories = buildMemories(state);
  const patterns = buildPatterns(state);
  const growthMoments = buildGrowthMoments(state);

  if (
    memories.length === 0 &&
    patterns.length === 0 &&
    growthMoments.length === 0
  ) {
    return null;
  }

  const reflection = buildReflection({
    memories,
    patterns,
    growthMoments,
    consistencySummary: state.consistencySummary,
  });

  return {
    subtitle: "Here's what I've learned about your journey.",
    memories,
    patterns,
    growthMoments,
    reflection,
    quickActions: [
      {
        id: 'insight',
        label: 'Related Insight',
        target: 'insight',
        isEnabled: true,
      },
      {
        id: 'conversation',
        label: 'Continue Conversation',
        target: 'conversation',
        isEnabled: true,
      },
      {
        id: 'weekly-review',
        label: 'Weekly Reflection',
        target: 'weekly-review',
        isEnabled: true,
      },
      {
        id: 'goals',
        label: 'Goal Guidance',
        target: 'goals',
        isEnabled: true,
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        target: 'dashboard',
        isEnabled: true,
      },
    ],
    accessibilityLabel: `Coach memory. ${memories[0]?.dateLabel ?? 'Recent'}: ${memories[0]?.title ?? reflection}`,
  };
}

function buildMemories(state: MemoryState): CoachMemoryItem[] {
  const memories: CoachMemoryItem[] = [];

  state.habitHistory.slice(0, 5).forEach((habit) => {
    memories.push({
      id: `habit-${habit.date}`,
      dateLabel: formatMemoryDate(habit.date),
      title: getHabitMemoryTitle(habit),
      explanation: getHabitMemoryExplanation(habit),
      icon: 'habit',
      target: 'dashboard',
    });
  });

  state.goalHistory.slice(0, 4).forEach((goal) => {
    memories.push({
      id: `goal-${goal.date}`,
      dateLabel: formatMemoryDate(goal.date),
      title: getGoalMemoryTitle(goal),
      explanation: getGoalMemoryExplanation(goal),
      icon: 'goal',
      target: 'goals',
    });
  });

  const latestAssistantMessages = state.chatMessages
    .filter((message) => message.role === 'assistant' && message.content.trim())
    .slice(-3);

  latestAssistantMessages.forEach((message, index) => {
    memories.push({
      id: `coach-${message.createdAt}-${index}`,
      dateLabel: formatMemoryDate(message.createdAt),
      title: 'A coaching theme came up in conversation.',
      explanation: summarizeCoachMessage(message.content),
      icon: 'sparkles',
      target: 'conversation',
    });
  });

  if (state.progressSummary?.workoutsCompleted) {
    memories.push({
      id: `progress-${state.progressSummary.period}`,
      dateLabel: 'This week',
      title: 'Your training rhythm is visible.',
      explanation:
        'The coach is using your recent workout consistency to shape more useful guidance.',
      icon: 'barbell',
      target: 'workout-history',
    });
  }

  return memories
    .sort(
      (a, b) => getDateSortValue(b.dateLabel) - getDateSortValue(a.dateLabel),
    )
    .slice(0, 12);
}

function buildPatterns(state: MemoryState): CoachMemoryPattern[] {
  const learnedPatterns = state.behavioralPatterns
    .slice(0, 3)
    .map((pattern) => ({
      id: `pattern-${pattern.type}`,
      pattern: getBehaviorPatternText(pattern),
      confidence: formatConfidence(pattern.confidence),
      whyItMatters: getBehaviorPatternWhy(pattern),
      target: getPatternTarget(pattern),
    }));

  if (learnedPatterns.length > 0) {
    return learnedPatterns;
  }

  const patterns: CoachMemoryPattern[] = [];

  if (state.consistencySummary) {
    patterns.push({
      id: 'pattern-consistency',
      pattern:
        state.consistencySummary.trend === 'improving'
          ? 'You are becoming more consistent.'
          : 'Your routines are becoming easier to read.',
      confidence: formatConfidence('medium'),
      whyItMatters:
        'Stable routines help the coach choose smaller, more realistic next steps.',
      target: 'dashboard',
    });
  }

  const personalization = state.personalizationHistory[0];

  if (personalization) {
    patterns.push({
      id: 'pattern-coaching-style',
      pattern: getCoachingStylePattern(personalization),
      confidence: formatConfidence(personalization.engagementProfile),
      whyItMatters:
        'This helps the coach adjust tone, timing, and how direct the guidance should feel.',
      target: 'conversation',
    });
  }

  return patterns.slice(0, 3);
}

function buildGrowthMoments(state: MemoryState): CoachGrowthMoment[] {
  const moments: CoachGrowthMoment[] = [];

  if (state.consistencySummary?.longestStreak) {
    moments.push({
      id: 'growth-longest-streak',
      title: 'Longest workout streak',
      detail: `${state.consistencySummary.longestStreak} consecutive days`,
    });
  }

  const improvingHabit = state.habitHistory.find(
    (habit) => habit.trend === 'improving',
  );

  if (improvingHabit) {
    moments.push({
      id: 'growth-habits',
      title: 'Habit consistency improved',
      detail: 'Recent routines are trending in the right direction',
    });
  }

  const improvingGoal = state.goalHistory.find(
    (goal) => goal.trend === 'improving',
  );

  if (improvingGoal) {
    moments.push({
      id: 'growth-goal',
      title: 'Goal momentum improved',
      detail: 'Your recent progress is moving forward',
    });
  }

  if (state.progressSummary && state.progressSummary.currentStreak > 0) {
    moments.push({
      id: 'growth-current-streak',
      title: 'Current momentum',
      detail: `${state.progressSummary.currentStreak} day streak`,
    });
  }

  return moments.slice(0, 3);
}

function buildReflection(input: {
  memories: CoachMemoryItem[];
  patterns: CoachMemoryPattern[];
  growthMoments: CoachGrowthMoment[];
  consistencySummary: ConsistencySummary | null;
}): string {
  if (input.patterns[0]) {
    return `${input.patterns[0].pattern} ${input.patterns[0].whyItMatters}`;
  }

  if (input.consistencySummary?.trend === 'improving') {
    return "You're becoming more consistent each week, especially when the next action is clear and repeatable.";
  }

  if (input.growthMoments[0]) {
    return 'Small habits are creating lasting improvements. The coach is using those moments to guide your next step.';
  }

  return 'The coach is starting to connect your routines, preferences, and progress into more personal guidance.';
}

function getHabitMemoryTitle(habit: HabitSnapshot): string {
  if (habit.trend === 'improving') {
    return 'Your consistency improved.';
  }

  if (habit.trend === 'declining') {
    return 'Your routine needed extra support.';
  }

  return 'Your routine stayed steady.';
}

function getHabitMemoryExplanation(habit: HabitSnapshot): string {
  if (habit.streakDays > 1) {
    return `The coach learned that you respond well when momentum is already building.`;
  }

  if (habit.trend === 'declining') {
    return 'The coach learned to keep guidance simpler when routines start to feel less stable.';
  }

  return 'The coach is learning which daily actions are becoming reliable for you.';
}

function getGoalMemoryTitle(goal: GoalProgressSnapshot): string {
  if (goal.trend === 'improving') {
    return 'Your goal momentum improved.';
  }

  if (goal.trend === 'declining') {
    return 'Your goal needed a smaller next step.';
  }

  return 'Your goal progress stayed steady.';
}

function getGoalMemoryExplanation(goal: GoalProgressSnapshot): string {
  if (goal.trend === 'improving') {
    return 'The coach learned that your recent routine is supporting the larger goal.';
  }

  if (goal.trend === 'declining') {
    return 'The coach learned to focus guidance on one manageable action instead of adding pressure.';
  }

  return 'The coach is tracking how your daily choices connect to your longer-term direction.';
}

function summarizeCoachMessage(content: string): string {
  const cleaned = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[-*]\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 118) {
    return cleaned;
  }

  return `${cleaned.slice(0, 115).trim()}...`;
}

function getBehaviorPatternText(pattern: BehavioralPattern): string {
  switch (pattern.type) {
    case 'responds_to_streaks':
      return 'Streaks help you stay engaged.';
    case 'responds_to_goals':
      return 'Goal progress motivates your next action.';
    case 'responds_to_recovery_guidance':
      return 'Recovery guidance is becoming useful for you.';
    case 'responds_to_notifications':
      return 'Timely reminders help you follow through.';
    case 'morning_engagement':
      return 'You engage best earlier in the day.';
    case 'evening_engagement':
      return 'Evening check-ins fit your routine.';
    case 'consistent_check_in_behavior':
      return 'Check-ins are becoming part of your rhythm.';
    case 'ignores_low_priority_reminders':
      return 'You respond better to fewer, more relevant prompts.';
    case 'high_dismissal_behavior':
      return 'Your coach should keep reminders focused.';
    default:
      return pattern.type.replace(/_/g, ' ');
  }
}

function getBehaviorPatternWhy(pattern: BehavioralPattern): string {
  switch (pattern.type) {
    case 'responds_to_streaks':
      return 'It means momentum-based coaching can help you keep showing up.';
    case 'responds_to_goals':
      return 'It helps connect daily actions to a bigger reason.';
    case 'responds_to_recovery_guidance':
      return 'It helps the coach protect progress when your body needs more care.';
    case 'morning_engagement':
      return 'It helps the coach bring important guidance earlier, when it is more useful.';
    case 'evening_engagement':
      return 'It helps the coach place reflection and recovery guidance later in the day.';
    default:
      return 'It helps the coach make guidance feel more timely and personal.';
  }
}

function getPatternTarget(pattern: BehavioralPattern): CoachMemoryTarget {
  if (pattern.type.includes('goal')) {
    return 'goals';
  }

  if (pattern.type.includes('recovery')) {
    return 'recovery';
  }

  return 'conversation';
}

function getCoachingStylePattern(
  personalization: PersonalizationSnapshot,
): string {
  switch (personalization.preferredCoachingStyle) {
    case 'direct':
      return 'You seem to do well with clear, direct coaching.';
    case 'educational':
      return 'You seem to value knowing why a recommendation matters.';
    case 'motivational':
      return 'Encouraging coaching appears to support your follow-through.';
    case 'balanced':
    default:
      return 'A balanced coaching style seems to fit you best.';
  }
}

function formatConfidence(value: string): string {
  switch (value) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Moderate confidence';
    case 'low':
    default:
      return 'Early signal';
  }
}

function formatMemoryDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (todayStart.getTime() - targetStart.getTime()) / 86400000,
  );

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffDays >= 7 && diffDays < 14) {
    return 'Last week';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getDateSortValue(label: string): number {
  if (label === 'Today') {
    return Date.now();
  }

  if (label === 'Yesterday') {
    return Date.now() - 86400000;
  }

  if (label === 'This week') {
    return Date.now() - 2 * 86400000;
  }

  if (label === 'Last week') {
    return Date.now() - 7 * 86400000;
  }

  const daysAgoMatch = label.match(/^(\d+) days ago$/);

  if (daysAgoMatch) {
    return Date.now() - Number(daysAgoMatch[1]) * 86400000;
  }

  const parsed = new Date(label);

  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function isOptionalEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'USER_PROFILE_NOT_FOUND',
      'GOAL_NOT_FOUND',
      'HABIT_SNAPSHOT_NOT_FOUND',
      'PERSONALIZATION_SNAPSHOT_NOT_FOUND',
      'NOT_FOUND',
    ].includes(error.code)
  );
}

export function trackCoachMemoryEvent(
  _event:
    | 'coach_memory_opened'
    | 'coach_memory_item_selected'
    | 'coach_memory_pattern_opened'
    | 'coach_memory_reflection_read',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
