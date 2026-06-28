import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RecoverySnapshot } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

type RecoveryReadinessCardProps = {
  recoverySnapshot: RecoverySnapshot | null;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';

type RecoveryStatus = {
  label: 'Ready' | 'Moderate' | 'Recovery Needed';
  badgeVariant: BadgeVariant;
  sentence: string;
};

const tokens = {
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  softBorder: '#f1f5f9',
  surface: '#f8fafc',
  skeleton: '#eef2f7',
  dangerSurface: '#fef2f2',
  dangerBorder: '#fecaca',
} as const;

export const RecoveryReadinessCard = memo(function RecoveryReadinessCard({
  errorMessage,
  isLoading,
  onRetry,
  recoverySnapshot,
}: RecoveryReadinessCardProps) {
  const model = useMemo(() => {
    if (!recoverySnapshot) {
      return null;
    }

    return buildRecoveryCardModel(recoverySnapshot);
  }, [recoverySnapshot]);

  if (isLoading) {
    return <RecoveryReadinessSkeleton />;
  }

  if (errorMessage) {
    return (
      <View accessibilityLabel="Recovery data unavailable." style={styles.card}>
        <View style={styles.errorContent}>
          <Text style={styles.label}>RECOVERY</Text>
          <Text style={styles.errorTitle}>Recovery data unavailable.</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Button
            accessibilityLabel="Try loading recovery data again"
            label="Try Again"
            onPress={onRetry}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }

  if (!model) {
    return (
      <View
        accessibilityLabel="No recovery data available yet. Complete your daily check-in to unlock recovery insights."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>RECOVERY</Text>
          <Text style={styles.emptyTitle}>No recovery data available yet.</Text>
          <Text style={styles.emptyMessage}>
            Complete your daily check-in to unlock recovery insights.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Recovery score ${model.score}. ${model.accessibilitySummary}`}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.label}>RECOVERY</Text>
        <Badge
          label={model.status.label}
          variant={model.status.badgeVariant}
          style={styles.statusBadge}
        />
      </View>

      <View style={styles.scoreGroup}>
        <Text style={styles.score}>{model.score}</Text>
        <Text style={styles.scoreSentence}>{model.status.sentence}</Text>
      </View>

      <View style={styles.metricsRow}>
        {model.metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={styles.metricValue}>{metric.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.recommendation}>
        <Text style={styles.recommendationLabel}>
          TODAY&apos;S RECOMMENDATION
        </Text>
        <Text style={styles.recommendationText}>{model.recommendation}</Text>
      </View>
    </View>
  );
});

function RecoveryReadinessSkeleton() {
  return (
    <View accessibilityLabel="Loading recovery readiness" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.scoreGroup}>
        <View style={styles.skeletonScore} />
        <View style={styles.skeletonSentence} />
      </View>
      <View style={styles.metricsRow}>
        <View style={styles.skeletonMetric} />
        <View style={styles.skeletonMetric} />
        <View style={styles.skeletonMetric} />
      </View>
      <View style={styles.recommendation}>
        <View style={styles.skeletonRecommendationLabel} />
        <View style={styles.skeletonRecommendationText} />
      </View>
    </View>
  );
}

function buildRecoveryCardModel(snapshot: RecoverySnapshot) {
  const status = getRecoveryStatus(snapshot.readinessScore);
  const sleep = formatFivePointMetric(snapshot.sourceContext.sleepQuality, {
    low: 'Poor',
    medium: 'Fair',
    high: 'Good',
  });
  const energy = formatFivePointMetric(snapshot.sourceContext.energyLevel, {
    low: 'Low',
    medium: 'Steady',
    high: 'High',
  });
  const soreness = formatSoreness(snapshot.sourceContext.muscleSoreness);
  const recommendation = getRecommendation(snapshot.recommendedIntensity);

  return {
    score: Math.round(snapshot.readinessScore),
    status,
    recommendation,
    accessibilitySummary: `${status.label} for training today. ${status.sentence} ${recommendation}`,
    metrics: [
      { label: 'Sleep', value: sleep },
      { label: 'Energy', value: energy },
      { label: 'Soreness', value: soreness },
    ],
  };
}

function getRecoveryStatus(score: number): RecoveryStatus {
  if (score >= 80) {
    return {
      label: 'Ready',
      badgeVariant: 'primary',
      sentence: 'Your body is ready for training.',
    };
  }

  if (score >= 60) {
    return {
      label: 'Moderate',
      badgeVariant: 'muted',
      sentence: 'Consider a moderate session today.',
    };
  }

  return {
    label: 'Recovery Needed',
    badgeVariant: 'danger',
    sentence: 'Recovery should be your priority.',
  };
}

function getRecommendation(
  intensity: RecoverySnapshot['recommendedIntensity'],
): string {
  switch (intensity) {
    case 'hard':
    case 'moderate':
      return 'Train at normal intensity.';
    case 'light':
      return 'Reduce volume by 20%.';
    case 'recovery':
    default:
      return 'Focus on recovery and mobility.';
  }
}

function formatFivePointMetric(
  value: number | undefined,
  labels: {
    low: string;
    medium: string;
    high: string;
  },
): string {
  if (typeof value !== 'number') {
    return 'Not set';
  }

  if (value >= 4) {
    return labels.high;
  }

  if (value <= 2) {
    return labels.low;
  }

  return labels.medium;
}

function formatSoreness(value: number | undefined): string {
  if (typeof value !== 'number') {
    return 'Not set';
  }

  if (value >= 4) {
    return 'High';
  }

  if (value <= 2) {
    return 'Low';
  }

  return 'Moderate';
}

const styles = StyleSheet.create({
  card: {
    gap: 26,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  headerRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  statusBadge: {
    backgroundColor: tokens.surface,
    borderColor: tokens.border,
  },
  scoreGroup: {
    gap: 8,
  },
  score: {
    color: tokens.text,
    fontSize: 64,
    lineHeight: 68,
    fontWeight: '800',
  },
  scoreSentence: {
    maxWidth: 340,
    color: tokens.secondaryText,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  metricValue: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  recommendation: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: tokens.softBorder,
    paddingTop: 20,
  },
  recommendationLabel: {
    color: tokens.tertiaryText,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  recommendationText: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  errorContent: {
    gap: 14,
  },
  errorTitle: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  errorMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: tokens.text,
    borderColor: tokens.text,
  },
  emptyContent: {
    gap: 10,
  },
  emptyTitle: {
    color: tokens.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  emptyMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 24,
  },
  skeletonLabel: {
    width: 76,
    height: 12,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonBadge: {
    width: 86,
    height: 28,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonScore: {
    width: 96,
    height: 60,
    borderRadius: 18,
    backgroundColor: tokens.skeleton,
  },
  skeletonSentence: {
    width: '76%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonMetric: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: tokens.skeleton,
  },
  skeletonRecommendationLabel: {
    width: 164,
    height: 12,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonRecommendationText: {
    width: '64%',
    height: 18,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
});
