import { StyleSheet } from 'react-native';
import { Button, Card, Text, colors } from '@elev9/ui';

export function RecoveryOfflineNotice({
  cacheAge,
  savedAt,
  onRetry,
}: {
  cacheAge?: 'recent' | 'old';
  savedAt?: string;
  onRetry?: () => void;
}) {
  const savedLabel = savedAt ? formatSavedAt(savedAt) : null;
  const message =
    cacheAge === 'old'
      ? 'Showing an older saved Recovery result. Reconnect to refresh it.'
      : savedLabel
        ? `Showing your last saved Recovery result from ${savedLabel}.`
        : 'Showing your last saved Recovery result.';

  return (
    <Card
      accessibilityLabel={`Offline. ${message}`}
      accessibilityLiveRegion="polite"
      style={styles.card}
    >
      <Text variant="title">You’re offline</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </Card>
  );
}

function formatSavedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'earlier';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  message: { color: colors.mutedText },
});
