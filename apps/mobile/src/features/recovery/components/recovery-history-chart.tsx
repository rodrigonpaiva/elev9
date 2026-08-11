import type { RecoveryExperienceHistoryItem } from '@elev9/types';
import { Card, colors, Text } from '@elev9/ui';
import { StyleSheet, View } from 'react-native';

import {
  availableHistoryPointCount,
  formatRecoveryLocalDate,
} from '../helpers/recovery-history-presentation';

export function RecoveryHistoryChart({
  history,
}: {
  history: RecoveryExperienceHistoryItem[];
}) {
  const points = history.filter((item) => item.availability === 'available');

  return (
    <Card
      accessibilityLabel={`Seven-day Recovery trend. ${availableHistoryPointCount(history)} results available.`}
      style={styles.card}
    >
      <Text variant="label">Recent results</Text>
      <View
        accessibilityRole="image"
        accessibilityLabel={`${points.length} Recovery points. ${points.map((item) => `${formatRecoveryLocalDate(item.localDate)}, score ${item.score}`).join('. ')}`}
        style={styles.chart}
      >
        {points.length === 0 ? (
          <Text style={styles.empty}>No results to show yet.</Text>
        ) : (
          points.map((item) => (
            <View key={item.localDate} style={styles.pointColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: Math.max(8, Math.min(100, item.score)) },
                  ]}
                />
              </View>
              <Text style={styles.score}>{item.score}</Text>
              <Text style={styles.date}>
                {formatRecoveryLocalDate(item.localDate)}
              </Text>
            </View>
          ))
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  chart: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  pointColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: { width: '100%', backgroundColor: colors.primary, borderRadius: 8 },
  score: { fontSize: 12, fontWeight: '700' },
  date: { color: colors.mutedText, fontSize: 11 },
  empty: { color: colors.mutedText },
});
