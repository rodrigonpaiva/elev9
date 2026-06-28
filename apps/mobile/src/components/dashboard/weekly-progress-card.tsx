import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ProgressSummaryResponse } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

type ProgressSummary = ProgressSummaryResponse['summary'];

type WeeklyProgressCardProps = {
  progressSummary: ProgressSummary | null;
  plannedWorkouts: number;
  nutritionAdherencePercentage?: number | null;
  recoveryScore?: number | null;
  trendValues?: number[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onOpenWeeklyReview?: () => void;
  onViewAnalytics?: () => void;
  onViewHistory?: () => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';
type TrendLabel = 'Improving' | 'Stable' | 'Needs Focus';

const tokens = {
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

export const WeeklyProgressCard = memo(function WeeklyProgressCard({
  errorMessage,
  isLoading,
  nutritionAdherencePercentage,
  onRetry,
  onOpenWeeklyReview,
  onViewAnalytics,
  onViewHistory,
  plannedWorkouts,
  progressSummary,
  recoveryScore,
  trendValues,
}: WeeklyProgressCardProps) {
  const model = useMemo(() => {
    if (!progressSummary) {
      return null;
    }

    if (
      isProgressEmpty({
        nutritionAdherencePercentage,
        progressSummary,
        recoveryScore,
      })
    ) {
      return null;
    }

    return buildWeeklyProgressModel({
      nutritionAdherencePercentage,
      plannedWorkouts,
      progressSummary,
      recoveryScore,
      trendValues,
    });
  }, [
    nutritionAdherencePercentage,
    plannedWorkouts,
    progressSummary,
    recoveryScore,
    trendValues,
  ]);

  if (isLoading) {
    return <WeeklyProgressSkeleton />;
  }

  if (errorMessage) {
    return (
      <View accessibilityLabel="Progress data unavailable." style={styles.card}>
        <View style={styles.errorContent}>
          <Text style={styles.label}>WEEKLY PROGRESS</Text>
          <Text style={styles.errorTitle}>Progress data unavailable.</Text>
          <Button
            accessibilityLabel="Retry loading progress data"
            label="Retry"
            onPress={onRetry}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  if (!model) {
    return (
      <View
        accessibilityLabel="No progress data yet. Complete workouts and check-ins to track your progress."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>WEEKLY PROGRESS</Text>
          <Text style={styles.emptyTitle}>No progress data yet.</Text>
          <Text style={styles.emptyMessage}>
            Complete workouts and check-ins to track your progress.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={model.accessibilityLabel} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>WEEKLY PROGRESS</Text>
        <Badge
          label={model.trend.label}
          variant={model.trend.badgeVariant}
          style={styles.trendBadge}
        />
      </View>

      <Text numberOfLines={2} style={styles.heroInsight}>
        {model.heroInsight}
      </Text>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.metricsRow}
      >
        {model.metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.momentumSection}>
        <Text numberOfLines={2} style={styles.momentumText}>
          {model.momentum}
        </Text>
        {model.sparklineValues ? (
          <Sparkline values={model.sparklineValues} />
        ) : null}
      </View>

      <View style={styles.focusBox}>
        <Text style={styles.focusLabel}>THIS WEEK&apos;S FOCUS</Text>
        <Text style={styles.focusText}>{model.focus}</Text>
      </View>

      {onViewHistory ? (
        <Button
          accessibilityLabel="View workout history"
          label="View History"
          onPress={onViewHistory}
          variant="ghost"
          style={styles.historyButton}
        />
      ) : null}

      {onOpenWeeklyReview ? (
        <Button
          accessibilityLabel="Open weekly review"
          label="Weekly Review"
          onPress={onOpenWeeklyReview}
          variant="ghost"
          style={styles.historyButton}
        />
      ) : null}

      {onViewAnalytics ? (
        <Button
          accessibilityLabel="View training analytics"
          label="View Analytics"
          onPress={onViewAnalytics}
          variant="ghost"
          style={styles.historyButton}
        />
      ) : null}
    </View>
  );
});

function WeeklyProgressSkeleton() {
  return (
    <View accessibilityLabel="Loading weekly progress" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonHero} />
      <View style={styles.metricsRow}>
        <View style={styles.skeletonMetric} />
        <View style={styles.skeletonMetric} />
        <View style={styles.skeletonMetric} />
      </View>
      <View style={styles.momentumSection}>
        <View style={styles.skeletonMomentum} />
      </View>
      <View style={styles.focusBox}>
        <View style={styles.skeletonFocusLabel} />
        <View style={styles.skeletonFocusText} />
      </View>
    </View>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const points = useMemo(() => buildSparklinePoints(values), [values]);

  if (points.length < 2) {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
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
  );
}

function buildWeeklyProgressModel({
  nutritionAdherencePercentage,
  plannedWorkouts,
  progressSummary,
  recoveryScore,
  trendValues,
}: {
  progressSummary: ProgressSummary;
  plannedWorkouts: number;
  nutritionAdherencePercentage?: number | null;
  recoveryScore?: number | null;
  trendValues?: number[];
}) {
  const workoutTarget = plannedWorkouts > 0 ? plannedWorkouts : 5;
  const workoutCompletion = Math.min(
    1,
    progressSummary.workoutsCompleted / workoutTarget,
  );
  const trend = getTrend({
    nutritionAdherencePercentage,
    recoveryScore,
    workoutCompletion,
  });
  const recoveryLabel = getRecoveryLabel(recoveryScore);
  const nutritionLabel =
    typeof nutritionAdherencePercentage === 'number'
      ? `${Math.round(nutritionAdherencePercentage)}%`
      : '--';
  const sparklineValues =
    trendValues && trendValues.length >= 2 ? trendValues.slice(-7) : null;

  return {
    trend,
    heroInsight: getHeroInsight(trend.label, progressSummary.currentStreak),
    metrics: [
      {
        label: 'Workouts',
        value: `${progressSummary.workoutsCompleted} / ${workoutTarget}`,
      },
      {
        label: 'Nutrition',
        value: nutritionLabel,
      },
      {
        label: 'Recovery',
        value: recoveryLabel,
      },
    ],
    momentum: getMomentum(progressSummary, nutritionAdherencePercentage),
    sparklineValues,
    focus: getWeeklyFocus({
      nutritionAdherencePercentage,
      progressSummary,
      recoveryScore,
      workoutTarget,
    }),
    accessibilityLabel: `Weekly progress ${trend.label.toLowerCase()}. ${progressSummary.workoutsCompleted} of ${workoutTarget} workouts completed. Nutrition adherence ${nutritionLabel}.`,
  };
}

function isProgressEmpty({
  nutritionAdherencePercentage,
  progressSummary,
  recoveryScore,
}: {
  progressSummary: ProgressSummary;
  nutritionAdherencePercentage?: number | null;
  recoveryScore?: number | null;
}): boolean {
  return (
    progressSummary.workoutsCompleted === 0 &&
    progressSummary.currentStreak === 0 &&
    progressSummary.lastWorkoutDate === null &&
    typeof nutritionAdherencePercentage !== 'number' &&
    typeof recoveryScore !== 'number'
  );
}

function getTrend({
  nutritionAdherencePercentage,
  recoveryScore,
  workoutCompletion,
}: {
  workoutCompletion: number;
  nutritionAdherencePercentage?: number | null;
  recoveryScore?: number | null;
}): {
  label: TrendLabel;
  badgeVariant: BadgeVariant;
} {
  const nutritionScore =
    typeof nutritionAdherencePercentage === 'number'
      ? nutritionAdherencePercentage / 100
      : 0.6;
  const recoveryMomentum =
    typeof recoveryScore === 'number' ? recoveryScore / 100 : 0.6;
  const average = (workoutCompletion + nutritionScore + recoveryMomentum) / 3;

  if (average >= 0.78) {
    return { label: 'Improving', badgeVariant: 'primary' };
  }

  if (average >= 0.52) {
    return { label: 'Stable', badgeVariant: 'muted' };
  }

  return { label: 'Needs Focus', badgeVariant: 'danger' };
}

function getHeroInsight(trend: TrendLabel, currentStreak: number): string {
  if (currentStreak >= 3) {
    return "You're building strong consistency.";
  }

  switch (trend) {
    case 'Improving':
      return "You're building strong consistency.";
    case 'Stable':
      return 'Progress is steady this week.';
    case 'Needs Focus':
    default:
      return "Let's regain momentum.";
  }
}

function getRecoveryLabel(score?: number | null): string {
  if (typeof score !== 'number') {
    return '--';
  }

  if (score >= 80) {
    return 'Good';
  }

  if (score >= 60) {
    return 'Steady';
  }

  return 'Low';
}

function getMomentum(
  summary: ProgressSummary,
  nutritionAdherencePercentage?: number | null,
): string {
  if (summary.currentStreak > 0) {
    return `${summary.currentStreak}-day workout streak`;
  }

  if (
    typeof nutritionAdherencePercentage === 'number' &&
    nutritionAdherencePercentage >= 80
  ) {
    return 'Nutrition adherence is on track';
  }

  if (summary.workoutsCompleted > 0) {
    return 'Training momentum has started';
  }

  return 'A completed session will start your momentum';
}

function getWeeklyFocus({
  nutritionAdherencePercentage,
  progressSummary,
  recoveryScore,
  workoutTarget,
}: {
  progressSummary: ProgressSummary;
  workoutTarget: number;
  nutritionAdherencePercentage?: number | null;
  recoveryScore?: number | null;
}): string {
  if (progressSummary.workoutsCompleted < workoutTarget) {
    return 'Complete your final workout.';
  }

  if (typeof recoveryScore === 'number' && recoveryScore < 60) {
    return 'Prioritize recovery tomorrow.';
  }

  if (
    typeof nutritionAdherencePercentage === 'number' &&
    nutritionAdherencePercentage < 70
  ) {
    return 'Stay consistent with meal timing.';
  }

  return 'Maintain current momentum.';
}

function buildSparklinePoints(values: number[]) {
  const width = 92;
  const height = 28;
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

const styles = StyleSheet.create({
  card: {
    gap: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  headerRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  trendBadge: {
    flexShrink: 0,
  },
  heroInsight: {
    color: tokens.text,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    minHeight: 70,
    justifyContent: 'center',
    gap: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  metricValue: {
    color: tokens.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  momentumSection: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  momentumText: {
    flex: 1,
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  sparkline: {
    width: 96,
    height: 32,
  },
  sparklineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: tokens.trend,
    opacity: 0.3,
    transformOrigin: '0px 1px',
  },
  focusBox: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  focusLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  focusText: {
    color: tokens.secondaryText,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
  },
  historyButton: {
    marginTop: -8,
  },
  errorContent: {
    gap: 16,
  },
  errorTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyContent: {
    gap: 12,
  },
  emptyTitle: {
    color: tokens.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  emptyMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
  },
  skeletonLabel: {
    width: 134,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonBadge: {
    width: 112,
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonHero: {
    width: '86%',
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonMetric: {
    flex: 1,
    height: 70,
    borderRadius: 18,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonMomentum: {
    width: '58%',
    height: 16,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonFocusLabel: {
    width: 118,
    height: 12,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonFocusText: {
    width: '76%',
    height: 14,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
});
