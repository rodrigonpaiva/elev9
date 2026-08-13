import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, colors, Text } from '@elev9/ui';

export type DailyCheckInSuccessProps = {
  isEdit: boolean;
  onDone: () => void;
};

export function DailyCheckInSuccess({
  isEdit,
  onDone,
}: DailyCheckInSuccessProps) {
  return (
    <Card style={styles.card} testID="daily-check-in-success">
      <View style={styles.mark} accessibilityLabel="Check-in saved">
        <Text style={styles.markText}>✓</Text>
      </View>
      <View style={styles.copy}>
        <Badge label="Saved" variant="primary" />
        <Text
          accessibilityRole="header"
          variant="headline"
          style={styles.title}
        >
          {isEdit ? 'Your check-in is updated.' : 'Thanks for checking in.'}
        </Text>
        <Text style={styles.subtitle}>
          Your Coach has a clearer picture of how you feel today.
        </Text>
      </View>
      <Button label="Continue" onPress={onDone} testID="daily-check-in-done" />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
    alignItems: 'flex-start',
  },
  mark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  markText: {
    color: colors.primaryText,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
  },
  copy: {
    gap: 10,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
});
