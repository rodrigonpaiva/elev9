import { Alert, StyleSheet } from 'react-native';

import { Button, Card, colors, Text } from '@elev9/ui';

export type DailyCheckInPendingProps = {
  isSyncing: boolean;
  hasFailed: boolean;
  onRetry: () => void;
  onDiscard: () => void;
  onReview: () => void;
};

export function DailyCheckInPending({
  isSyncing,
  hasFailed,
  onRetry,
  onDiscard,
  onReview,
}: DailyCheckInPendingProps) {
  return (
    <Card style={styles.card} testID="daily-check-in-pending">
      <Text accessibilityRole="header" variant="title">
        {hasFailed ? 'Check-in needs attention' : 'Check-in waiting to sync'}
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {isSyncing
          ? 'Syncing your check-in…'
          : hasFailed
            ? "We couldn't sync your check-in yet."
            : "Your check-in is saved on this device and will sync when you're back online."}
      </Text>
      <Button
        disabled={isSyncing}
        label={hasFailed ? 'Try again' : 'Sync now'}
        loading={isSyncing}
        onPress={onRetry}
        testID="daily-check-in-sync-retry"
      />
      <Button label="Review answers" onPress={onReview} variant="ghost" />
      <Button
        label="Discard check-in"
        onPress={() =>
          Alert.alert(
            'Discard check-in?',
            'These answers have not reached your Coach yet.',
            [
              { text: 'Keep answers', style: 'cancel' },
              { text: 'Discard', style: 'destructive', onPress: onDiscard },
            ],
          )
        }
        variant="ghost"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  message: {
    color: colors.mutedText,
  },
});
