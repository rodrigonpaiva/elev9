import type { RecoveryExperienceCurrent } from '@elev9/types';
import { Badge, Card, colors, Text } from '@elev9/ui';
import { StyleSheet, View } from 'react-native';

import { recoveryScoreAccessibilityLabel } from '../helpers/recovery-accessibility';
import { categoryLabel } from '../helpers/recovery-copy';

export function RecoveryScoreHero({
  current,
}: {
  current: RecoveryExperienceCurrent;
}) {
  return (
    <Card
      accessibilityLabel={recoveryScoreAccessibilityLabel(current)}
      accessibilityRole="summary"
      style={styles.card}
    >
      <Badge label={categoryLabel(current.category)} variant="primary" />
      <Text variant="label" style={styles.eyebrow}>
        Recovery
      </Text>
      <View accessible={false} style={styles.scoreRow}>
        <Text variant="headline" style={styles.score}>
          {current.score}
        </Text>
      </View>
      <Text variant="title" style={styles.category}>
        {categoryLabel(current.category)}
      </Text>
      <Text style={styles.caption}>
        A simple view of how ready your body may be for today’s activity.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8 },
  eyebrow: { marginTop: 8 },
  scoreRow: { alignItems: 'center', marginVertical: 4 },
  score: { color: colors.primary, fontSize: 64, lineHeight: 70 },
  category: { textAlign: 'center' },
  caption: { color: colors.mutedText, textAlign: 'center' },
});
