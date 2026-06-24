import { memo, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ApiClientError } from '@elev9/api-client';
import type {
  ProgressSummaryResponse,
  WorkoutHistoryResponse,
} from '@elev9/types';
import { Button, Text } from '@elev9/ui';

import { apiClient, mobileApiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/app-navigator';

type WorkoutHistoryItem = WorkoutHistoryResponse['workoutLogs'][number];
type ProgressSummary = ProgressSummaryResponse['summary'];

type HistoryModel = {
  streakTitle: string;
  streakSubtitle: string;
  summaryMetrics: Array<{
    label: string;
    value: string;
  }>;
  monthlyInsight: string;
};

const INITIAL_LIMIT = 50;

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
  successSurface: '#ecfdf5',
  successText: '#166534',
} as const;

export function WorkoutHistoryScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutHistoryItem[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkoutHistory = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const [historyResult, summaryResult] = await Promise.allSettled([
        mobileApiClient.progress.getWorkoutHistory(INITIAL_LIMIT),
        apiClient.progress.getSummary('week'),
      ]);

      if (historyResult.status === 'fulfilled') {
        setWorkoutLogs(historyResult.value.workoutLogs);
      } else {
        setErrorMessage(getHistoryErrorMessage(historyResult.reason));
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.summary);
      } else {
        setSummary(null);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadWorkoutHistory();
    }, [loadWorkoutHistory]),
  );

  const model = useMemo(
    () => buildHistoryModel(workoutLogs, summary),
    [summary, workoutLogs],
  );

  const handleStartTraining = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'home' });
  }, [navigation]);

  const handleContinueTraining = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'workout' });
  }, [navigation]);

  const handleViewProgress = useCallback(() => {
    navigation.replace('MainTabs', { initialTab: 'progress' });
  }, [navigation]);

  const handleViewAnalytics = useCallback(() => {
    navigation.navigate('TrainingAnalytics');
  }, [navigation]);

  const handleReviewRecovery = useCallback(() => {
    navigation.navigate('DailyCheckInHistory');
  }, [navigation]);

  const handleOpenCoach = useCallback(() => {
    navigation.navigate('CoachChat');
  }, [navigation]);

  const handleOpenWorkout = useCallback(
    (workoutLog: WorkoutHistoryItem) => {
      navigation.navigate('WorkoutSessionDetail', { workoutLog });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: WorkoutHistoryItem }) => (
      <TimelineItem item={item} onPress={handleOpenWorkout} />
    ),
    [handleOpenWorkout],
  );

  if (isLoading) {
    return <WorkoutHistorySkeleton />;
  }

  if (errorMessage) {
    return (
      <WorkoutHistoryStateView
        title="Unable to load workout history."
        actionLabel="Try Again"
        onAction={() => void loadWorkoutHistory()}
      />
    );
  }

  if (workoutLogs.length === 0) {
    return (
      <WorkoutHistoryStateView
        title="No workouts yet."
        message="Complete your first workout to start building your training history."
        actionLabel="Start Training"
        onAction={handleStartTraining}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={workoutLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={TimelineSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadWorkoutHistory({ refresh: true })}
            tintColor={tokens.text}
          />
        }
        ListHeaderComponent={
          <HistoryHeader
            model={model}
            workoutCount={workoutLogs.length}
          />
        }
        ListFooterComponent={
          <HistoryFooter
            monthlyInsight={model.monthlyInsight}
            onContinueTraining={handleContinueTraining}
            onOpenCoach={handleOpenCoach}
            onReviewRecovery={handleReviewRecovery}
            onViewAnalytics={handleViewAnalytics}
            onViewProgress={handleViewProgress}
          />
        }
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

export function WorkoutSessionDetailScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'WorkoutSessionDetail'>>();
  const { workoutLog } = route.params;

  const totalSets = useMemo(
    () =>
      workoutLog.completedExercises.reduce(
        (sum, exercise) => sum + exercise.setsDone,
        0,
      ),
    [workoutLog.completedExercises],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        accessibilityLabel={`Workout session. ${workoutLog.durationMinutes} minutes. ${workoutLog.completedExercises.length} exercises.`}
        style={styles.detailContent}
      >
        <View style={styles.detailHero}>
          <Text style={styles.detailDate}>{formatTimelineDate(workoutLog.date)}</Text>
          <Text style={styles.detailTitle}>{getWorkoutTitle(workoutLog)}</Text>
          <Text style={styles.detailSubtitle}>
            A focused summary of this completed workout.
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile label="Duration" value={`${workoutLog.durationMinutes} min`} />
          <SummaryTile
            label="Exercises"
            value={String(workoutLog.completedExercises.length)}
          />
          <SummaryTile label="Sets" value={String(totalSets)} />
          <SummaryTile
            label="Status"
            value={workoutLog.feedback?.difficulty ? 'Completed' : 'Saved'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>EXERCISES</Text>
          <View style={styles.exerciseList}>
            {workoutLog.completedExercises.map((exercise) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {exercise.setsDone} sets • {exercise.repsDone} reps
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Button label="Back to History" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const HistoryHeader = memo(function HistoryHeader({
  model,
  workoutCount,
}: {
  model: HistoryModel;
  workoutCount: number;
}) {
  return (
    <View style={styles.headerStack}>
      <View
        accessibilityLabel={`${model.streakTitle}. ${model.streakSubtitle}`}
        style={styles.streakHero}
      >
        <Text style={styles.eyebrow}>TRAINING HISTORY</Text>
        <Text style={styles.streakTitle}>{model.streakTitle}</Text>
        <Text style={styles.streakSubtitle}>{model.streakSubtitle}</Text>
      </View>

      <View style={styles.summaryGrid}>
        {model.summaryMetrics.map((metric) => (
          <SummaryTile
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </View>

      <View style={styles.timelineHeader}>
        <Text style={styles.sectionLabel}>WORKOUT TIMELINE</Text>
        <Text style={styles.timelineCount}>
          {workoutCount} recent {workoutCount === 1 ? 'session' : 'sessions'}
        </Text>
      </View>
    </View>
  );
});

const SummaryTile = memo(function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
});

const TimelineItem = memo(function TimelineItem({
  item,
  onPress,
}: {
  item: WorkoutHistoryItem;
  onPress: (item: WorkoutHistoryItem) => void;
}) {
  const coachNote = getCoachNotePreview(item);

  return (
    <Pressable
      accessibilityLabel={`Workout session. Completed ${formatTimelineDate(item.date)}. ${item.durationMinutes} minutes. ${item.completedExercises.length} exercises.`}
      accessibilityRole="button"
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.timelineItem,
        pressed ? styles.timelineItemPressed : null,
      ]}
    >
      <View style={styles.timelineMarkerColumn}>
        <View style={styles.timelineDot} />
      </View>
      <View style={styles.timelineCard}>
        <View style={styles.timelineTopRow}>
          <Text style={styles.timelineDate}>{formatTimelineDate(item.date)}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>
        <Text style={styles.workoutTitle}>{getWorkoutTitle(item)}</Text>
        <Text style={styles.workoutMeta}>
          {item.durationMinutes} min • {item.completedExercises.length}{' '}
          {item.completedExercises.length === 1 ? 'exercise' : 'exercises'}
        </Text>
        <Text numberOfLines={1} style={styles.coachPreview}>
          {coachNote}
        </Text>
      </View>
    </Pressable>
  );
});

function TimelineSeparator() {
  return <View style={styles.timelineSeparator} />;
}

const HistoryFooter = memo(function HistoryFooter({
  monthlyInsight,
  onContinueTraining,
  onOpenCoach,
  onReviewRecovery,
  onViewAnalytics,
  onViewProgress,
}: {
  monthlyInsight: string;
  onContinueTraining: () => void;
  onViewAnalytics: () => void;
  onViewProgress: () => void;
  onReviewRecovery: () => void;
  onOpenCoach: () => void;
}) {
  return (
    <View style={styles.footerStack}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>MONTHLY INSIGHT</Text>
        <Text style={styles.insightText}>{monthlyInsight}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActions}>
          <Button label="Continue Training" onPress={onContinueTraining} />
          <Button
            label="View Training Analytics"
            onPress={onViewAnalytics}
            variant="ghost"
          />
          <Button label="View Progress" onPress={onViewProgress} variant="ghost" />
          <Button
            label="Review Recovery"
            onPress={onReviewRecovery}
            variant="ghost"
          />
          <Button label="Open Coach" onPress={onOpenCoach} variant="ghost" />
        </View>
      </View>
    </View>
  );
});

function WorkoutHistorySkeleton() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLabel="Loading workout history" style={styles.skeletonContent}>
        <View style={styles.skeletonHero} />
        <View style={styles.summaryGrid}>
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
          <View style={styles.skeletonMetric} />
        </View>
        <View style={styles.skeletonTimelineItem} />
        <View style={styles.skeletonTimelineItem} />
        <View style={styles.skeletonTimelineItem} />
      </View>
    </SafeAreaView>
  );
}

function WorkoutHistoryStateView({
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
      <View accessibilityLabel={`${title} ${message ?? ''}`} style={styles.state}>
        <Text style={styles.stateTitle}>{title}</Text>
        {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
        <Button label={actionLabel} onPress={onAction} style={styles.stateButton} />
      </View>
    </SafeAreaView>
  );
}

function buildHistoryModel(
  workoutLogs: WorkoutHistoryItem[],
  summary: ProgressSummary | null,
): HistoryModel {
  const weekLogs = getLogsWithinDays(workoutLogs, 7);
  const monthLogs = getLogsWithinDays(workoutLogs, 31);
  const workoutsCompleted = summary?.workoutsCompleted ?? weekLogs.length;
  const trainingTime =
    summary?.totalDurationMinutes ??
    weekLogs.reduce((sum, item) => sum + item.durationMinutes, 0);
  const averageDuration =
    summary?.averageDurationMinutes ??
    (weekLogs.length > 0 ? Math.round(trainingTime / weekLogs.length) : 0);
  const exercisesPerformed = weekLogs.reduce(
    (sum, item) => sum + item.completedExercises.length,
    0,
  );
  const currentStreak = summary?.currentStreak ?? calculateWorkoutStreak(workoutLogs);

  return {
    streakTitle:
      currentStreak > 0
        ? `${currentStreak} Day Streak`
        : `${workoutsCompleted} Workouts This Week`,
    streakSubtitle:
      currentStreak >= 3
        ? "You're building momentum."
        : 'Small actions compound.',
    summaryMetrics: [
      { label: 'Workouts Completed', value: String(workoutsCompleted) },
      { label: 'Training Time', value: `${trainingTime} min` },
      { label: 'Exercises Performed', value: String(exercisesPerformed) },
      { label: 'Average Duration', value: `${averageDuration} min` },
    ],
    monthlyInsight: getMonthlyInsight(monthLogs),
  };
}

function getLogsWithinDays(
  workoutLogs: WorkoutHistoryItem[],
  days: number,
): WorkoutHistoryItem[] {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));

  return workoutLogs.filter(
    (item) => new Date(`${item.date}T00:00:00.000Z`) >= cutoff,
  );
}

function calculateWorkoutStreak(workoutLogs: WorkoutHistoryItem[]): number {
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

function getMonthlyInsight(monthLogs: WorkoutHistoryItem[]): string {
  if (monthLogs.length >= 12) {
    return `You completed ${monthLogs.length} workouts this month. Your consistency is becoming a real strength.`;
  }

  if (monthLogs.length >= 4) {
    return `You completed ${monthLogs.length} workouts this month. Training momentum is building.`;
  }

  return 'Complete a few more workouts to reveal your monthly training trend.';
}

function getCoachNotePreview(item: WorkoutHistoryItem): string {
  if (item.feedback?.notes?.trim()) {
    return item.feedback.notes.trim();
  }

  if (item.feedback?.difficulty === 'hard') {
    return 'Strong execution today.';
  }

  if (item.durationMinutes >= 45) {
    return 'Excellent consistency.';
  }

  return 'Another step forward.';
}

function getWorkoutTitle(item: WorkoutHistoryItem): string {
  return `Workout Day ${item.workoutDayIndex + 1}`;
}

function getHistoryErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to load workout history.';
}

function formatTimelineDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(date);
  }

  if (diffDays >= 7 && diffDays < 14) {
    return 'Last Week';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
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
  headerStack: {
    gap: 22,
    marginBottom: 20,
  },
  streakHero: {
    gap: 10,
    paddingTop: 8,
  },
  eyebrow: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  streakTitle: {
    color: tokens.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
  },
  streakSubtitle: {
    color: tokens.secondaryText,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryTile: {
    width: '48%',
    minHeight: 88,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryValue: {
    color: tokens.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  summaryLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  timelineHeader: {
    gap: 4,
    paddingTop: 2,
  },
  sectionLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  timelineCount: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineItemPressed: {
    opacity: 0.86,
  },
  timelineMarkerColumn: {
    width: 16,
    alignItems: 'center',
    paddingTop: 22,
  },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: tokens.text,
  },
  timelineCard: {
    flex: 1,
    gap: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  timelineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timelineDate: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: tokens.successSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: tokens.successText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  workoutTitle: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  workoutMeta: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  coachPreview: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  timelineSeparator: {
    height: 12,
  },
  footerStack: {
    gap: 18,
    paddingTop: 22,
  },
  card: {
    gap: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  insightText: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '800',
  },
  quickActions: {
    gap: 10,
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
  skeletonMetric: {
    width: '48%',
    height: 88,
    borderRadius: 22,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonTimelineItem: {
    height: 132,
    borderRadius: 26,
    backgroundColor: tokens.skeletonSoft,
  },
  detailContent: {
    flex: 1,
    gap: 24,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  detailHero: {
    gap: 8,
    paddingTop: 8,
  },
  detailDate: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  detailTitle: {
    color: tokens.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },
  detailSubtitle: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  exerciseList: {
    gap: 2,
  },
  exerciseRow: {
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: tokens.softBorder,
    paddingVertical: 13,
  },
  exerciseName: {
    color: tokens.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  exerciseMeta: {
    color: tokens.secondaryText,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
