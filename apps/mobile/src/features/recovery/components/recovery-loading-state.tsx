import { Card, colors, Text } from '@elev9/ui';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export function RecoveryLoadingState() {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <Card style={styles.card}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.copy}>Loading your Recovery...</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  copy: { color: colors.mutedText },
});
