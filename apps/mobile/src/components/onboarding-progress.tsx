import { StyleSheet, View } from 'react-native';

import { colors, Text } from '@elev9/ui';

export type OnboardingProgressStage =
  | 'profile'
  | 'fitness_profile'
  | 'training_plan';

const STAGES: OnboardingProgressStage[] = [
  'profile',
  'fitness_profile',
  'training_plan',
];

export function OnboardingProgress({
  stage,
}: {
  stage: OnboardingProgressStage;
}) {
  const current = STAGES.indexOf(stage) + 1;
  return (
    <View style={styles.container} accessibilityLabel={`Step ${current} of 3`}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Step {current} of {STAGES.length}
        </Text>
        <Text style={styles.hint}>
          You can close the app and continue later.
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${(current / STAGES.length) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { gap: 4 },
  label: { color: colors.primary, fontWeight: '700' },
  hint: { color: colors.mutedText, fontSize: 12 },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#263247',
  },
  fill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
});
