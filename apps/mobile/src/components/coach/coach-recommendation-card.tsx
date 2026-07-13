import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Text } from '@elev9/ui';

import {
  getCoachRecommendationTarget,
  type CoachUnifiedRecommendation,
} from '../../hooks/coach';
import { CoachEvidenceList } from './coach-evidence-list';

type CoachRecommendationCardProps = {
  recommendation: CoachUnifiedRecommendation | null;
  evidenceTitles?: string[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onPressCta: () => void;
  ctaLabel: string;
};

export const CoachRecommendationCard = memo(function CoachRecommendationCard({
  ctaLabel,
  errorMessage,
  evidenceTitles,
  isLoading,
  onPressCta,
  onRetry,
  recommendation,
}: CoachRecommendationCardProps) {
  if (isLoading) {
    return <CoachRecommendationSkeleton />;
  }

  if (errorMessage) {
    return (
      <View
        accessibilityLabel="Recommendation unavailable."
        style={styles.card}
      >
        <Text style={styles.label}>TOP RECOMMENDATION</Text>
        <Text style={styles.title}>Recommendation unavailable.</Text>
        <Button label="Try Again" onPress={onRetry} style={styles.button} />
      </View>
    );
  }

  if (!recommendation) {
    return (
      <View
        accessibilityLabel="No top recommendation available."
        style={styles.card}
      >
        <Text style={styles.label}>TOP RECOMMENDATION</Text>
        <Text style={styles.title}>No recommendation yet.</Text>
        <Text style={styles.summary}>
          Your coach will surface one once there is enough context.
        </Text>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Top recommendation. ${recommendation.title}. ${recommendation.detail}.`}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.label}>TOP RECOMMENDATION</Text>
        <Badge
          label={getRecommendationBadgeLabel(recommendation.priority)}
          variant={getRecommendationBadgeVariant(recommendation.priority)}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{recommendation.title}</Text>
        <Text style={styles.summary}>{recommendation.detail}</Text>
      </View>

      {evidenceTitles && evidenceTitles.length > 0 ? (
        <CoachEvidenceList
          title="Why this matters"
          evidence={evidenceTitles.map((title, index) => ({
            id: `${recommendation.code}:${index}`,
            type: 'supporting',
            source: {
              id: recommendation.code,
              expert: recommendation.expert,
              source: recommendation.expert,
            },
            expert: recommendation.expert,
            importance: 'LOW',
            confidence: 'MEDIUM',
            availability: 'AVAILABLE',
            title,
            metadata: {},
          }))}
          maxItems={2}
        />
      ) : null}

      <Button
        accessibilityLabel={ctaLabel}
        label={ctaLabel}
        onPress={onPressCta}
        style={styles.button}
      />
    </View>
  );
});

function CoachRecommendationSkeleton() {
  return (
    <View accessibilityLabel="Loading top recommendation" style={styles.card}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonLabel} />
        <View style={styles.skeletonBadge} />
      </View>
      <View style={styles.skeletonBody}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonSummary} />
      </View>
      <View style={styles.skeletonButton} />
    </View>
  );
}

function getRecommendationBadgeLabel(
  priority: CoachUnifiedRecommendation['priority'],
): string {
  switch (priority) {
    case 'PRIMARY':
      return 'Primary';
    case 'SAFETY_CRITICAL':
      return 'Safety';
    case 'SUPPORTING':
      return 'Supporting';
    case 'INFORMATIONAL':
    default:
      return 'Info';
  }
}

function getRecommendationBadgeVariant(
  priority: CoachUnifiedRecommendation['priority'],
): 'primary' | 'muted' | 'danger' {
  switch (priority) {
    case 'SAFETY_CRITICAL':
      return 'danger';
    case 'SUPPORTING':
      return 'muted';
    case 'PRIMARY':
    case 'INFORMATIONAL':
    default:
      return 'primary';
  }
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    gap: 8,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: '#111827',
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
  },
  summary: {
    color: '#5b6472',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  button: {
    width: '100%',
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonLabel: {
    width: 120,
    height: 14,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
  skeletonBadge: {
    width: 72,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
  skeletonBody: {
    gap: 10,
  },
  skeletonTitle: {
    width: '78%',
    height: 24,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
  skeletonSummary: {
    width: '92%',
    height: 16,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
  skeletonButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: '#eef2f7',
  },
});
