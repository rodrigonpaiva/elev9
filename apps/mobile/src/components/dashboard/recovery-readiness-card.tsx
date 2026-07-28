import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GetCurrentRecoveryExperienceResponse } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

type RecoveryReadinessCardProps = {
  recoveryExperience: GetCurrentRecoveryExperienceResponse | null;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onOpenRecovery: () => void;
};

const tokens = {
  card: '#ffffff',
  text: '#111827',
  secondaryText: '#6b7280',
  tertiaryText: '#9ca3af',
  border: '#e5e7eb',
  surface: '#f8fafc',
  skeleton: '#eef2f7',
} as const;

export const RecoveryReadinessCard = memo(function RecoveryReadinessCard({
  errorMessage,
  isLoading,
  onRetry,
  onOpenRecovery,
  recoveryExperience,
}: RecoveryReadinessCardProps) {
  if (isLoading) {
    return <RecoveryReadinessSkeleton />;
  }

  if (errorMessage) {
    return (
      <View accessibilityLabel="Recovery data unavailable." style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.label}>RECOVERY</Text>
          <Text style={styles.title}>Recovery data unavailable.</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <Button
            accessibilityLabel="Try loading recovery data again"
            label="Try Again"
            onPress={onRetry}
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  if (!recoveryExperience || recoveryExperience.availability !== 'available' || !recoveryExperience.recovery) {
    return (
      <View
        accessibilityLabel="Recovery is not available yet. Open Recovery to see what to do next."
        style={styles.card}
      >
        <View style={styles.content}>
          <Text style={styles.label}>RECOVERY</Text>
          <Text style={styles.title}>Recovery is not available yet.</Text>
          <Text style={styles.message}>
            Complete your daily check-in to unlock Recovery guidance.
          </Text>
          <Button label="Open Recovery" onPress={onOpenRecovery} style={styles.button} />
        </View>
      </View>
    );
  }

  const current = recoveryExperience.recovery;
  const category = formatCategory(current.category);

  return (
    <View
      accessibilityLabel={`Recovery score ${current.score}. Category ${category}. ${formatInsight(current.insight.bodyKey)}`}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.label}>RECOVERY</Text>
        <Badge label={category} variant="primary" />
      </View>
      <View style={styles.scoreGroup}>
        <Text style={styles.score}>{current.score}</Text>
        <Text style={styles.scoreSentence}>{formatInsight(current.insight.bodyKey)}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{formatFreshness(current.freshness)}</Text>
        <Text style={styles.meta}>Open for details</Text>
      </View>
      <Button
        accessibilityLabel="Open Recovery details"
        label="View Recovery"
        onPress={onOpenRecovery}
        style={styles.button}
        variant="secondary"
      />
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
      <View style={styles.skeletonButton} />
    </View>
  );
}

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatFreshness(freshness: string): string {
  switch (freshness) {
    case 'current':
      return 'Updated today';
    case 'stale':
      return 'Most recent available result';
    case 'legacy':
      return 'Earlier Recovery result';
    default:
      return 'Refresh time unavailable';
  }
}

function formatInsight(key: string): string {
  const normalized = key.toLowerCase();

  if (normalized.includes('low')) {
    return 'Consider prioritizing recovery today.';
  }
  if (normalized.includes('moderate')) {
    return 'Keep today’s intensity flexible.';
  }
  if (normalized.includes('good') || normalized.includes('high')) {
    return 'Your recovery supports today’s planned activity.';
  }

  return 'Open Recovery for today’s guidance.';
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  content: { gap: 10 },
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
  title: { color: tokens.text, fontSize: 18, fontWeight: '700' },
  message: { color: tokens.secondaryText, lineHeight: 22 },
  scoreGroup: { gap: 8 },
  score: { color: tokens.text, fontSize: 56, lineHeight: 62, fontWeight: '800' },
  scoreSentence: { color: tokens.secondaryText, fontSize: 16, lineHeight: 23 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  meta: { color: tokens.tertiaryText, fontSize: 12 },
  button: { marginTop: 2 },
  skeletonLabel: { width: 82, height: 14, backgroundColor: tokens.skeleton, borderRadius: 6 },
  skeletonBadge: { width: 82, height: 28, backgroundColor: tokens.skeleton, borderRadius: 14 },
  skeletonScore: { width: 94, height: 62, backgroundColor: tokens.skeleton, borderRadius: 12 },
  skeletonSentence: { width: '82%', height: 22, backgroundColor: tokens.skeleton, borderRadius: 8 },
  skeletonButton: { width: '100%', height: 48, backgroundColor: tokens.skeleton, borderRadius: 18 },
});
