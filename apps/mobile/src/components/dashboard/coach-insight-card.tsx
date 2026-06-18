import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CoachDecision } from '@elev9/types';
import { Badge, Button, Text } from '@elev9/ui';

export type CoachInsightBadgeLabel =
  | 'Insight'
  | 'Recommendation'
  | 'Recovery Focus'
  | 'Performance Focus';

type CoachInsightCardProps = {
  coachDecision: CoachDecision | null;
  badgeLabel: CoachInsightBadgeLabel;
  recommendedAction: string;
  ctaLabel: string;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onPressCta: () => void;
};

type BadgeVariant = 'primary' | 'muted' | 'danger';

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
} as const;

export const CoachInsightCard = memo(function CoachInsightCard({
  badgeLabel,
  coachDecision,
  ctaLabel,
  errorMessage,
  isLoading,
  onPressCta,
  onRetry,
  recommendedAction,
}: CoachInsightCardProps) {
  const badgeVariant = useMemo(
    () => getBadgeVariant(badgeLabel),
    [badgeLabel],
  );
  const accessibilityLabel = useMemo(() => {
    if (!coachDecision) {
      return undefined;
    }

    return `AI Coach insight. ${coachDecision.headline}. Recommended action: ${recommendedAction}.`;
  }, [coachDecision, recommendedAction]);

  if (isLoading) {
    return <CoachInsightSkeleton />;
  }

  if (errorMessage) {
    return (
      <View accessibilityLabel="Coach insight unavailable." style={styles.card}>
        <View style={styles.errorContent}>
          <Text style={styles.label}>AI COACH</Text>
          <Text style={styles.errorTitle}>Coach insight unavailable.</Text>
          <Button
            accessibilityLabel="Try again loading coach insight"
            label="Try Again"
            onPress={onRetry}
            style={styles.primaryButton}
          />
        </View>
      </View>
    );
  }

  if (!coachDecision) {
    return (
      <View
        accessibilityLabel="Your AI coach is learning about you. Complete workouts, meals and check-ins to unlock personalized coaching."
        style={styles.card}
      >
        <View style={styles.emptyContent}>
          <Text style={styles.label}>AI COACH</Text>
          <Text style={styles.emptyTitle}>
            Your AI coach is learning about you.
          </Text>
          <Text style={styles.emptyMessage}>
            Complete workouts, meals and check-ins to unlock personalized
            coaching.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>AI COACH</Text>
        <Badge
          label={badgeLabel}
          variant={badgeVariant}
          style={styles.badge}
        />
      </View>

      <View style={styles.messageGroup}>
        <Text numberOfLines={3} style={styles.headline}>
          {coachDecision.headline}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {coachDecision.summary}
        </Text>
      </View>

      <View style={styles.actionBox}>
        <Text style={styles.actionLabel}>RECOMMENDED ACTION</Text>
        <Text numberOfLines={2} style={styles.actionText}>
          {recommendedAction}
        </Text>
      </View>

      <Button
        accessibilityLabel={ctaLabel}
        label={ctaLabel}
        onPress={onPressCta}
        style={styles.primaryButton}
      />
    </View>
  );
});

function CoachInsightSkeleton() {
  return (
    <View accessibilityLabel="Loading AI coach insight" style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.messageGroup}>
        <View style={styles.skeletonHeadline} />
        <View style={styles.skeletonHeadlineShort} />
        <View style={styles.skeletonSummary} />
      </View>
      <View style={styles.actionBox}>
        <View style={styles.skeletonActionLabel} />
        <View style={styles.skeletonActionText} />
      </View>
      <View style={styles.skeletonButton} />
    </View>
  );
}

function getBadgeVariant(label: CoachInsightBadgeLabel): BadgeVariant {
  switch (label) {
    case 'Performance Focus':
    case 'Insight':
      return 'primary';
    case 'Recovery Focus':
    case 'Recommendation':
    default:
      return 'muted';
  }
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.card,
    paddingHorizontal: 24,
    paddingVertical: 26,
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
  badge: {
    flexShrink: 0,
  },
  messageGroup: {
    gap: 10,
  },
  headline: {
    color: tokens.text,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },
  summary: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
  },
  actionBox: {
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: tokens.softBorder,
    backgroundColor: tokens.surface,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  actionLabel: {
    color: tokens.tertiaryText,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  actionText: {
    color: tokens.text,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  primaryButton: {
    width: '100%',
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
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
  },
  emptyMessage: {
    color: tokens.secondaryText,
    fontSize: 16,
    lineHeight: 23,
  },
  skeletonLabel: {
    width: 74,
    height: 13,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonBadge: {
    width: 132,
    height: 30,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonHeadline: {
    width: '92%',
    height: 27,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonHeadlineShort: {
    width: '68%',
    height: 27,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonSummary: {
    width: '84%',
    height: 15,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonActionLabel: {
    width: 122,
    height: 12,
    borderRadius: 999,
    backgroundColor: tokens.skeleton,
  },
  skeletonActionText: {
    width: '76%',
    height: 17,
    borderRadius: 999,
    backgroundColor: tokens.skeletonSoft,
  },
  skeletonButton: {
    height: 48,
    borderRadius: 16,
    backgroundColor: tokens.skeleton,
  },
});
