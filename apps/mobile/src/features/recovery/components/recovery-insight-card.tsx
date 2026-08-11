import type { RecoveryExperienceInsight } from '@elev9/types';
import { Button, Card, colors, Text } from '@elev9/ui';
import { StyleSheet } from 'react-native';

import { actionLabel, insightToneLabel } from '../helpers/recovery-copy';

export function RecoveryInsightCard({
  insight,
  onAction,
}: {
  insight: RecoveryExperienceInsight;
  onAction?: () => void;
}) {
  return (
    <Card style={styles.card}>
      <Text variant="label">Today’s guidance</Text>
      <Text variant="title" style={styles.title}>
        {insightToneLabel(insight.tone)}
      </Text>
      <Text style={styles.body}>
        {copyFromKey(insight.bodyKey, insight.tone)}
      </Text>
      {onAction ? (
        <Button
          accessibilityLabel={actionLabel(insight.action)}
          label={actionLabel(insight.action)}
          onPress={onAction}
          style={styles.button}
          variant="secondary"
        />
      ) : null}
    </Card>
  );
}

function copyFromKey(
  key: string,
  tone: RecoveryExperienceInsight['tone'],
): string {
  const normalized = key.toLowerCase();

  if (normalized.includes('low')) {
    return 'Consider prioritizing recovery and keeping today’s intensity flexible.';
  }
  if (normalized.includes('moderate')) {
    return 'You may benefit from keeping intensity flexible today.';
  }
  if (normalized.includes('good') || normalized.includes('high')) {
    return 'Your recovery supports your planned activity today.';
  }

  return tone === 'caution'
    ? 'Consider adjusting your plan to keep today comfortable and manageable.'
    : 'Use this guidance alongside how you feel during today’s activity.';
}

const styles = StyleSheet.create({
  card: { borderColor: 'rgba(34, 197, 94, 0.35)' },
  title: { marginTop: 8 },
  body: { color: colors.mutedText, marginTop: 8 },
  button: { marginTop: 16 },
});
