import { StyleSheet, View } from 'react-native';

import { Button, Card, colors, Text } from '@elev9/ui';

import type { DailyCheckInQuestion as DailyCheckInQuestionModel } from '../constants/daily-check-in-questions';
import { DailyCheckInScale } from './daily-check-in-scale';

export type DailyCheckInQuestionProps = {
  question: DailyCheckInQuestionModel;
  value?: number;
  canGoBack: boolean;
  errorMessage?: string | null;
  onChange: (value: number) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function DailyCheckInQuestion({
  question,
  value,
  canGoBack,
  errorMessage,
  onChange,
  onBack,
  onContinue,
}: DailyCheckInQuestionProps) {
  return (
    <Card style={styles.card} testID="daily-check-in-question">
      <View style={styles.copy}>
        <Text accessibilityRole="header" variant="title">
          {question.title}
        </Text>
        <Text style={styles.description}>{question.description}</Text>
      </View>

      <DailyCheckInScale
        highLabel={question.highLabel}
        labels={question.scaleLabels}
        lowLabel={question.lowLabel}
        onChange={onChange}
        title={question.title}
        value={value}
      />

      {errorMessage ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canGoBack ? (
          <Button
            accessibilityLabel="Go back to the previous question"
            label="Back"
            onPress={onBack}
            style={styles.actionButton}
            variant="ghost"
          />
        ) : null}
        <Button
          accessibilityLabel="Continue to the next question"
          disabled={value === undefined}
          label="Continue"
          onPress={onContinue}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 24,
  },
  copy: {
    gap: 8,
  },
  description: {
    color: colors.mutedText,
  },
  error: {
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
  },
});
