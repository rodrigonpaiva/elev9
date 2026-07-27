import { StyleSheet } from 'react-native';

import { Button, Card, colors, Text } from '@elev9/ui';

export type DailyCheckInErrorProps = {
  message: string;
  onRetry: () => void;
  onBack: () => void;
};

export function DailyCheckInError({
  message,
  onRetry,
  onBack,
}: DailyCheckInErrorProps) {
  return (
    <Card style={styles.card} testID="daily-check-in-error">
      <Text accessibilityRole="header" variant="title">
        Check-in not saved
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </Text>
      <Button
        label="Try again"
        onPress={onRetry}
        testID="daily-check-in-retry"
      />
      <Button label="Review answers" onPress={onBack} variant="ghost" />
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
