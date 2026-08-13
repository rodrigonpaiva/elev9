import type { RecoveryExperienceFactor } from '@elev9/types';
import { Card, colors, Text } from '@elev9/ui';
import { StyleSheet, View } from 'react-native';

import { recoveryFactorAccessibilityLabel } from '../helpers/recovery-accessibility';
import {
  factorExplanation,
  factorLabel,
  impactLabel,
} from '../helpers/recovery-copy';

export function RecoveryFactorRow({
  factor,
}: {
  factor: RecoveryExperienceFactor;
}) {
  return (
    <Card
      accessibilityLabel={recoveryFactorAccessibilityLabel(factor)}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={styles.factor}>{factorLabel(factor)}</Text>
        <Text style={[styles.impact, impactStyle(factor.impact)]}>
          {impactLabel(factor.impact)}
        </Text>
      </View>
      <Text style={styles.explanation}>{factorExplanation(factor)}</Text>
    </Card>
  );
}

function impactStyle(impact: RecoveryExperienceFactor['impact']) {
  if (impact === 'positive') return styles.positive;
  if (impact === 'negative') return styles.negative;
  return styles.neutral;
}

const styles = StyleSheet.create({
  card: { paddingVertical: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  factor: { flex: 1, fontWeight: '700' },
  impact: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  positive: { color: colors.primary },
  negative: { color: '#fca5a5' },
  neutral: { color: colors.mutedText },
  explanation: { color: colors.mutedText, marginTop: 8 },
});
