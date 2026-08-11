import type { RecoveryExperienceFreshness } from '@elev9/types';
import { Card, colors, Text } from '@elev9/ui';
import { StyleSheet } from 'react-native';

import { freshnessLabel } from '../helpers/recovery-copy';

export function RecoveryFreshnessNote({
  freshness,
  lastUpdatedAt,
}: {
  freshness: RecoveryExperienceFreshness;
  lastUpdatedAt: string;
}) {
  return (
    <Card
      accessibilityLabel={`${freshnessLabel(freshness)}. ${formatLastUpdated(lastUpdatedAt)}`}
      style={styles.card}
    >
      <Text style={styles.label}>{freshnessLabel(freshness)}</Text>
      <Text style={styles.timestamp}>{formatLastUpdated(lastUpdatedAt)}</Text>
    </Card>
  );
}

function formatLastUpdated(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Last update time unavailable';
  }

  return `Updated ${new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)}`;
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14 },
  label: { color: colors.text, fontWeight: '700' },
  timestamp: { color: colors.mutedText, marginTop: 4 },
});
