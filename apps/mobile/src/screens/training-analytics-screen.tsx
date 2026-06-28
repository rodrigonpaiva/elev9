import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  GetCurrentGoalResponse,
  ProgressSummaryResponse,
  WorkoutHistoryResponse,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient, mobileApiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type WorkoutLog = WorkoutHistoryResponse['workoutLogs'][number];
type ProgressSummary = ProgressSummaryResponse['summary'];
type CurrentGoal = GetCurrentGoalResponse['goal'];

type Metric = {
  label: string;
  value: string;
};

type TrainingFocus = {
  label: string;
  value: number;
};

type AnalyticsModel = {
  scoreLabel: 'Strong Momentum' | 'Steady Progress' | 'Needs Focus';
  scoreMessage: string;
  consistencyMetrics: Metric[];
  volumeMetrics: Metric[];
  focusDistribution: TrainingFocus[];
  coachInsight: string;
  trendValues: number[] | null;
  recommendedAction: {
    label: string;
    onPress: () => void;
  };
  accessibilityLabel: string;
};

type AnalyticsSection =
  | 'consistency'
  | 'volume'
  | 'focus'
  | 'coach'
  | 'trend'
  | 'action';

const ANALYTICS_SECTIONS: AnalyticsSection[] = [
  'consistency',
  'volume',
  'focus',
  'coach',
  'trend',
  'action',
];

const HISTORY_LIMIT = 50;

const tokens = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#eef2f7',
  surface: '#f8fafc',
  skeleton: '#e9eef5',
  skeletonSoft: '#f5f7fb',
  trend: '#111827',
} as const;

export function TrainingAnalyticsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [coachDecision, setCoachDecision] = useState<CoachDecision | null>(
    null,
  );
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal | null>(null);
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

    const [historyResult, summaryResult, coachResult, goalResult] =
      await Promise.allSettled([
        mobileApiClient.progress.getWorkoutHistory(HISTORY_LIMIT),
        apiClient.progress.getSummary('week'),
        apiClient.ai.getTodayCoachDecision(),
        apiClient.goals.getCurrentGoal(),
      ]);

    if (historyResult.status === 'fulfilled') {
      setWorkoutLogs(historyResult.value.workoutLogs);
    } else {
      setErrorMessage(getAnalyticsErrorMessage(historyResult.reason));
    }

    setSummary(
      summaryResult.status === 'fulfilled' ? summaryResult.value.summary : null,
    );
    setCoachDecision(
      coachResult.status === 'fulfilled'
        ? coachResult.value.coachDecision
        : null,
    );
    setCurrentGoal(
      goalResult.status === 'fulfilled' ? goalResult.value.goal : null,
    );
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStartTraining = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'home' });
  }, [navigation]);

  const handleReviewRecovery = useCallback(() => {
    navigation.navigate('DailyCheckInHistory');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleViewHistory = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'history' });
  }, [navigation]);

  const model = useMemo(
    () =>
      buildAnalyticsModel({
        coachDecision,
        currentGoal,
        onOpenCoach: handleOpenCoach,
        onReviewRecovery: handleReviewRecovery,
        onStartTraining: handleStartTraining,
        onViewHistory: handleViewHistory,
        summary,
        workoutLogs,
      }),
    [
      coachDecision,
      currentGoal,
      handleOpenCoach,
      handleReviewRecovery,
      handleStartTraining,
      handleViewHistory,
      summary,
      workoutLogs,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: AnalyticsSection }) => {
      if (!model) {
        return null;
      }

      switch (item) {
        case 'consistency':
          return (
            <MetricSection
              title="CONSISTENCY"
              metrics={model.consistencyMetrics}
            />
          );
        case 'volume':
          return (
            <MetricSection
              title="VOLUME & DURATION"
              metrics={model.volumeMetrics}
            />
          );
        case 'focus':
          return (
            <TrainingFocusSection distribution={model.focusDistribution} />
          );
        case 'coach':
          return <CoachInsight insight={model.coachInsight} />;
        case 'trend':
          return model.trendValues ? (
            <RecentTrend values={model.trendValues} />
          ) : null;
        case 'action':
          return <RecommendedAction action={model.recommendedAction} />;
        default:
          return null;
      }
    },
    [model],
  );

  if (isLoading) {
    return <TrainingAnalyticsSkeleton />;
  }

  if (errorMessage) {
    return (
      <TrainingAnalyticsStateView
        title="Unable to load training analytics."
        actionLabel="Try Again"
        onAction={() => void load()}
      />
    );
  }

  if (!model) {
    return (
      <TrainingAnalyticsStateView
        title="No training analytics yet."
        message="Complete workouts to unlock your training trends."
        actionLabel="Start Training"
        onAction={handleStartTraining}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={ANALYTICS_SECTIONS}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={SectionSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={tokens.text}
          />
        }
        ListHeaderComponent={<TrainingScoreHero model={model} />}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const TrainingScoreHero = memo(function TrainingScoreHero({
  model,
}: {
  model: AnalyticsModel;
}) {
  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.hero}>
      <Text style={styles.eyebrow}>TRAINING ANALYTICS</Text>
      <Text style={styles.heroTitle}>{model.scoreLabel}</Text>
      <Text style={styles.heroMessage}>{model.scoreMessage}</Text>
    </View>
  );
});

const MetricSection = memo(function MetricSection({
  metrics,
  title,
}: {
  title: string;
  metrics: Metric[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.metricRow}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text numberOfLines={1} style={styles.metricValue}>
              {metric.value}
            </Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const TrainingFocusSection = memo(function TrainingFocusSection({
  distribution,
}: {
  distribution: TrainingFocus[];
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>TRAINING FOCUS</Text>
      <View style={styles.focusList}>
        {distribution.map((item) => (
          <View key={item.label} style={styles.focusItem}>
            <View style={styles.focusTopRow}>
              <Text style={styles.focusLabel}>{item.label}</Text>
              <Text style={styles.focusValue}>{item.value}%</Text>
            </View>
            <View style={styles.focusTrack}>
              <View style={[styles.focusFill, { width: `${item.value}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const CoachInsight = memo(function CoachInsight({
  insight,
}: {
  insight: string;
}) {
  return (
    <View style={styles.coachCard}>
      <Text style={styles.sectionLabel}>COACH INSIGHT</Text>
      <Text style={styles.coachText}>{insight}</Text>
    </View>
  );
});

const RecentTrend = memo(function RecentTrend({
  values,
}: {
  values: number[];
}) {
  const points = useMemo(() => buildSparklinePoints(values), [values]);

  if (points.length < 2) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>RECENT TREND</Text>
      <View
        accessibilityLabel="Recent seven day training trend"
        style={styles.sparkline}
      >
        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1];
          const segment = buildSegment(point, nextPoint);

          return (
            <View
              key={`${point.x}-${point.y}-${nextPoint.x}-${nextPoint.y}`}
              style={[
                styles.sparklineSegment,
                {
                  left: point.x,
                  top: point.y,
                  width: segment.length,
                  transform: [{ rotateZ: `${segment.angle}deg` }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
});

const RecommendedAction = memo(function RecommendedAction({
  action,
}: {
  action: AnalyticsModel['recommendedAction'];
}) {
  return (
    <View style={styles.actionCard}>
      <Text style={styles.sectionLabel}>RECOMMENDED NEXT ACTION</Text>
      <Text style={styles.actionText}>{action.label}</Text>
      <Button label={action.label} onPress={action.onPress} />
    </View>
  );
});

function SectionSeparator() {
  return <View style={styles.separator} />;
}

function TrainingAnalyticsSkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel="Loading training analytics"
        style={styles.skeletonContent}
      >
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonMetricRow}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
        </View>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    </SafeAreaView>
  );
}

function TrainingAnalyticsStateView({
  actionLabel,
  message,
  onAction,
  title,
}: {
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel={`${title} ${message ?? ''}`}
        style={styles.state}
      >
        <Text style={styles.stateTitle}>{title}</Text>
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.stateButton}
        />
      </View>
    </SafeAreaView>
  );
}

function buildAnalyticsModel({
  coachDecision,
  currentGoal,
  onOpenCoach,
  onReviewRecovery,
  onStartTraining,
  onViewHistory,
  summary,
  workoutLogs,
}: {
  workoutLogs: WorkoutLog[];
  summary: ProgressSummary | null;
  coachDecision: CoachDecision | null;
  currentGoal: CurrentGoal | null;
  onStartTraining: () => void;
  onReviewRecovery: () => void;
  onOpenCoach: () => void;
  onViewHistory: () => void;
}): AnalyticsModel | null {
  if (
    workoutLogs.length === 0 &&
    (!summary || summary.workoutsCompleted === 0)
  ) {
    return null;
  }

  const weekLogs = getLogsWithinDays(workoutLogs, 7);
  const workoutsCompleted = summary?.workoutsCompleted ?? weekLogs.length;
  const totalDurationMinutes =
    summary?.totalDurationMinutes ??
    weekLogs.reduce((sum, item) => sum + item.durationMinutes, 0);
  const averageDurationMinutes =
    summary?.averageDurationMinutes ??
    (weekLogs.length > 0
      ? Math.round(totalDurationMinutes / weekLogs.length)
      : 0);
  const currentStreak =
    summary?.currentStreak ?? calculateWorkoutStreak(workoutLogs);
  const plannedWorkouts = getPlannedWorkoutTarget(currentGoal);
  const adherence = Math.min(
    100,
    Math.round((workoutsCompleted / plannedWorkouts) * 100),
  );
  const totalExercises = weekLogs.reduce(
    (sum, item) => sum + item.completedExercises.length,
    0,
  );
  const scoreLabel = getScoreLabel(adherence, currentStreak);
  const scoreMessage = getScoreMessage(scoreLabel);
  const focusDistribution = getTrainingFocusDistribution(workoutLogs);
  const trendValues = getRecentTrendValues(workoutLogs);

  return {
    scoreLabel,
    scoreMessage,
    consistencyMetrics: [
      { label: 'Workouts', value: `${workoutsCompleted} workouts` },
      { label: 'Adherence', value: `${adherence}%` },
      { label: 'Streak', value: `${currentStreak}-day` },
    ],
    volumeMetrics: [
      { label: 'Training Time', value: formatDuration(totalDurationMinutes) },
      { label: 'Avg Duration', value: `${averageDurationMinutes} min` },
      { label: 'Exercises', value: `${totalExercises}` },
    ],
    focusDistribution,
    coachInsight: getCoachInsight({
      adherence,
      coachDecision,
      focusDistribution,
      scoreLabel,
    }),
    trendValues,
    recommendedAction: getRecommendedAction({
      adherence,
      onOpenCoach,
      onReviewRecovery,
      onStartTraining,
      onViewHistory,
      scoreLabel,
    }),
    accessibilityLabel: `Training analytics. ${scoreLabel}. ${workoutsCompleted} workouts completed this week. ${adherence} percent adherence.`,
  };
}

function getLogsWithinDays(
  workoutLogs: WorkoutLog[],
  days: number,
): WorkoutLog[] {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));

  return workoutLogs.filter(
    (item) => new Date(`${item.date}T00:00:00.000Z`) >= cutoff,
  );
}

function calculateWorkoutStreak(workoutLogs: WorkoutLog[]): number {
  const workoutDates = new Set(workoutLogs.map((item) => item.date));
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  let streak = 0;

  while (workoutDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function getPlannedWorkoutTarget(currentGoal: CurrentGoal | null): number {
  if (!currentGoal) {
    return 5;
  }

  return 5;
}

function getScoreLabel(
  adherence: number,
  currentStreak: number,
): AnalyticsModel['scoreLabel'] {
  if (adherence >= 80 || currentStreak >= 3) {
    return 'Strong Momentum';
  }

  if (adherence >= 45 || currentStreak > 0) {
    return 'Steady Progress';
  }

  return 'Needs Focus';
}

function getScoreMessage(scoreLabel: AnalyticsModel['scoreLabel']): string {
  switch (scoreLabel) {
    case 'Strong Momentum':
      return "You've trained consistently this week.";
    case 'Steady Progress':
      return 'Your recent sessions show steady improvement.';
    case 'Needs Focus':
    default:
      return 'Completing your next planned workout will rebuild momentum.';
  }
}

function getTrainingFocusDistribution(
  workoutLogs: WorkoutLog[],
): TrainingFocus[] {
  const totals = {
    Strength: 0,
    Conditioning: 0,
    Mobility: 0,
    Recovery: 0,
  };

  workoutLogs.slice(0, 12).forEach((item) => {
    const descriptor = `${item.feedback?.notes ?? ''} ${item.completedExercises
      .map((exercise) => exercise.name)
      .join(' ')}`.toLowerCase();

    if (descriptor.includes('mobility') || descriptor.includes('stretch')) {
      totals.Mobility += 1;
    } else if (
      descriptor.includes('conditioning') ||
      descriptor.includes('hiit') ||
      descriptor.includes('burpee')
    ) {
      totals.Conditioning += 1;
    } else if (descriptor.includes('recovery')) {
      totals.Recovery += 1;
    } else {
      totals.Strength += 1;
    }
  });

  const total =
    Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;

  return Object.entries(totals).map(([label, value]) => ({
    label,
    value: Math.round((value / total) * 100),
  }));
}

function getCoachInsight({
  adherence,
  coachDecision,
  focusDistribution,
  scoreLabel,
}: {
  coachDecision: CoachDecision | null;
  adherence: number;
  focusDistribution: TrainingFocus[];
  scoreLabel: AnalyticsModel['scoreLabel'];
}): string {
  if (coachDecision?.summary.trim()) {
    return coachDecision.summary.trim();
  }

  const topFocus = [...focusDistribution].sort((a, b) => b.value - a.value)[0];

  if (scoreLabel === 'Strong Momentum') {
    return 'Your consistency is improving. Keep the same weekly rhythm.';
  }

  if (adherence < 50) {
    return 'Complete your next planned workout to rebuild training momentum.';
  }

  if (topFocus?.label === 'Strength') {
    return 'Your strength sessions are stable. Add one mobility session next.';
  }

  return 'You are training well. Keep the next session focused and repeatable.';
}

function getRecentTrendValues(workoutLogs: WorkoutLog[]): number[] | null {
  const values = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);

    return workoutLogs
      .filter((item) => item.date === key)
      .reduce((sum, item) => sum + item.durationMinutes, 0);
  });

  return values.some((value) => value > 0) ? values : null;
}

function getRecommendedAction({
  adherence,
  onOpenCoach,
  onReviewRecovery,
  onStartTraining,
  onViewHistory,
  scoreLabel,
}: {
  adherence: number;
  scoreLabel: AnalyticsModel['scoreLabel'];
  onStartTraining: () => void;
  onReviewRecovery: () => void;
  onOpenCoach: () => void;
  onViewHistory: () => void;
}): AnalyticsModel['recommendedAction'] {
  if (scoreLabel === 'Needs Focus' || adherence < 50) {
    return { label: 'Start next workout', onPress: onStartTraining };
  }

  if (adherence >= 85) {
    return { label: 'Review recovery', onPress: onReviewRecovery };
  }

  if (scoreLabel === 'Strong Momentum') {
    return { label: 'View workout history', onPress: onViewHistory };
  }

  return { label: 'Open coach', onPress: onOpenCoach };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function buildSparklinePoints(values: number[]) {
  const width = 250;
  const height = 58;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xStep = width / Math.max(1, values.length - 1);

  return values.map((value, index) => ({
    x: index * xStep,
    y: height - ((value - min) / range) * height,
  }));
}

function buildSegment(
  point: { x: number; y: number },
  nextPoint: { x: number; y: number },
) {
  const dx = nextPoint.x - point.x;
  const dy = nextPoint.y - point.y;

  return {
    length: Math.sqrt(dx * dx + dy * dy),
    angle: Math.atan2(dy, dx) * (180 / Math.PI),
  };
}

function getAnalyticsErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load training analytics.';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  hero: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 22,
  },
  eyebrow: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: tokens.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
  },
  heroMessage: {
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  card: {
    gap: 15,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 76,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricValue: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  focusList: {
    gap: 13,
  },
  focusItem: {
    gap: 8,
  },
  focusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  focusLabel: {
    color: tokens.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  focusValue: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  focusTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: tokens.surface,
  },
  focusFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: tokens.text,
  },
  coachCard: {
    gap: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  coachText: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '800',
  },
  sparkline: {
    height: 62,
    width: 254,
    alignSelf: 'center',
  },
  sparklineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: tokens.trend,
    opacity: 0.42,
    transformOrigin: '0px 1px',
  },
  actionCard: {
    gap: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  actionText: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800',
  },
  separator: {
    height: 14,
  },
  state: {
    flex: 1,
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: tokens.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  stateButton: {
    marginTop: 6,
  },
  skeletonContent: {
    flex: 1,
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  skeletonHero: {
    height: 132,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMetricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonMetric: {
    flex: 1,
    height: 76,
    borderRadius: 18,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonCard: {
    height: 128,
    borderRadius: 28,
    backgroundColor: tokens.skeletonSoft,
  },
});
