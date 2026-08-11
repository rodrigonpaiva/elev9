import type { RecoveryExperienceHistoryItem } from '@elev9/types';
import { Badge, Card, SectionHeader, Text } from '@elev9/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { categoryLabel, freshnessLabel } from '../helpers/recovery-copy';
import { formatRecoveryLocalDate } from '../helpers/recovery-history-presentation';

export function RecoveryHistoryList({
  history,
  onOpenItem,
}: {
  history: RecoveryExperienceHistoryItem[];
  onOpenItem?: (localDate: string) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Recovery history"
        subtitle="Your recent daily results."
      />
      {history.length === 0 ? (
        <Card>
          <Text>No Recovery history yet.</Text>
        </Card>
      ) : (
        history.map((item) => (
          <Pressable
            key={item.localDate}
            accessibilityLabel={`${formatRecoveryLocalDate(item.localDate)}, score ${item.score}, ${categoryLabel(item.category)}`}
            accessibilityRole={onOpenItem ? 'button' : 'summary'}
            onPress={onOpenItem ? () => onOpenItem(item.localDate) : undefined}
            style={({ pressed }) => [
              styles.pressable,
              pressed ? styles.pressed : null,
            ]}
          >
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.date}>
                    {formatRecoveryLocalDate(item.localDate)}
                  </Text>
                  <Text style={styles.meta}>
                    {freshnessLabel(item.freshness)}
                  </Text>
                </View>
                <View style={styles.scoreBlock}>
                  <Text variant="title">{item.score}</Text>
                  <Badge
                    label={categoryLabel(item.category)}
                    variant="primary"
                  />
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  pressable: { borderRadius: 28 },
  pressed: { opacity: 0.8 },
  card: { paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  date: { fontWeight: '700' },
  meta: { color: '#94a3b8', fontSize: 13 },
  scoreBlock: { alignItems: 'flex-end', gap: 6 },
});
