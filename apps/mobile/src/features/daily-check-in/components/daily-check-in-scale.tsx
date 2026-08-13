import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, Text } from '@elev9/ui';

import {
  DAILY_CHECK_IN_MAX,
  DAILY_CHECK_IN_MIN,
} from '../models/daily-check-in-form-state';

export type DailyCheckInScaleProps = {
  title: string;
  value?: number;
  labels: readonly [string, string, string, string, string];
  lowLabel: string;
  highLabel: string;
  onChange: (value: number) => void;
};

export function DailyCheckInScale({
  title,
  value,
  labels,
  lowLabel,
  highLabel,
  onChange,
}: DailyCheckInScaleProps) {
  return (
    <View
      accessibilityLabel={`${title} scale`}
      accessibilityRole="radiogroup"
      style={styles.container}
      testID="daily-check-in-scale"
    >
      <View style={styles.options}>
        {labels.map((label, index) => {
          const optionValue = index + DAILY_CHECK_IN_MIN;
          const selected = value === optionValue;

          return (
            <Pressable
              accessibilityHint={`Select ${label}.`}
              accessibilityLabel={`${title}, ${optionValue} of ${DAILY_CHECK_IN_MAX}, ${label}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityValue={{
                min: DAILY_CHECK_IN_MIN,
                max: DAILY_CHECK_IN_MAX,
                now: optionValue,
                text: label,
              }}
              key={optionValue}
              onPress={() => onChange(optionValue)}
              style={({ pressed }) => [
                styles.option,
                selected ? styles.selectedOption : null,
                pressed ? styles.pressedOption : null,
              ]}
              testID={`daily-check-in-scale-option-${optionValue}`}
            >
              <Text
                style={[styles.optionNumber, selected && styles.selectedText]}
              >
                {optionValue}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.optionLabel, selected && styles.selectedText]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View accessible={false} style={styles.extremes}>
        <Text style={styles.extremeLabel}>{lowLabel}</Text>
        <Text style={[styles.extremeLabel, styles.extremeRight]}>
          {highLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: 4,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pressedOption: {
    transform: [{ scale: 0.97 }],
  },
  optionNumber: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  optionLabel: {
    color: colors.mutedText,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primaryText,
  },
  extremes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  extremeLabel: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  extremeRight: {
    textAlign: 'right',
  },
});
