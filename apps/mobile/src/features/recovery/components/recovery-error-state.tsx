import { Button, Card, Text } from '@elev9/ui';
import { StyleSheet } from 'react-native';

export function RecoveryErrorState({
  message,
  isRetrying,
  onRetry,
}: {
  message?: string;
  isRetrying: boolean;
  onRetry?: () => void;
}) {
  return (
    <Card accessibilityLiveRegion="polite" style={styles.card}>
      <Text variant="title">Recovery unavailable</Text>
      <Text style={styles.message}>{message ?? 'We could not load Recovery. Please try again.'}</Text>
      {onRetry ? (
        <Button label="Retry" loading={isRetrying} onPress={onRetry} style={styles.button} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  message: { color: '#94a3b8' },
  button: { marginTop: 8 },
});

