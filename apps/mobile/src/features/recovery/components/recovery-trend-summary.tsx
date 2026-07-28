import type { RecoveryExperienceTrend } from '@elev9/types';
import { Card, colors, SectionHeader, Text } from '@elev9/ui';
import { StyleSheet } from 'react-native';

import { recoveryTrendAccessibilityLabel } from '../helpers/recovery-accessibility';
import { trendLabel } from '../helpers/recovery-copy';

export function RecoveryTrendSummary({
  trend,
  availablePointCount,
}: {
  trend: RecoveryExperienceTrend;
  availablePointCount: number;
}) {
  return (
    <Card
      accessibilityLabel={recoveryTrendAccessibilityLabel(trend, availablePointCount)}
      style={styles.card}
    >
      <SectionHeader title="Seven-day trend" subtitle="Your recent Recovery pattern." />
      <Text variant="title" style={styles.direction}>
        {trendLabel(trend.direction)}
      </Text>
      <Text style={styles.copy}>
        {trend.direction === 'insufficient_data'
          ? 'Complete more daily check-ins to see a trend.'
          : `${availablePointCount} result${availablePointCount === 1 ? '' : 's'} available for this view.`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  direction: { color: colors.primary },
  copy: { color: colors.mutedText },
});

