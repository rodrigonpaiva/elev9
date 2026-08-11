import { Button, Card, Text } from '@elev9/ui';
import { StyleSheet } from 'react-native';

export function RecoveryEmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card accessibilityRole="summary" style={styles.card}>
      <Text variant="title">{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  message: { color: '#94a3b8' },
  button: { marginTop: 8 },
});
