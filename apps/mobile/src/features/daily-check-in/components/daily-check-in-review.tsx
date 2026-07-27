import { Pressable, StyleSheet, View } from 'react-native';

import type { SubmitDailyCheckInRequest } from '@elev9/types';
import { Button, Card, colors, Text } from '@elev9/ui';

import { DAILY_CHECK_IN_QUESTIONS } from '../constants/daily-check-in-questions';
import { DailyCheckInField } from '../models/daily-check-in-form-state';

export type DailyCheckInReviewProps = {
  values: SubmitDailyCheckInRequest;
  isSubmitting: boolean;
  isEdit: boolean;
  onEdit: (field: DailyCheckInField) => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function DailyCheckInReview({
  values,
  isSubmitting,
  isEdit,
  onEdit,
  onBack,
  onSubmit,
}: DailyCheckInReviewProps) {
  return (
    <Card style={styles.card} testID="daily-check-in-review">
      <View style={styles.copy}>
        <Text accessibilityRole="header" variant="title">
          {isEdit ? 'Update today&apos;s check-in' : 'Ready to check in?'}
        </Text>
        <Text style={styles.subtitle}>
          Review your answers. Your Coach will use them to understand your day.
        </Text>
      </View>

      <View style={styles.answers}>
        {DAILY_CHECK_IN_QUESTIONS.map((question) => (
          <Pressable
            accessibilityHint={`Change your ${question.title.toLowerCase()} answer.`}
            accessibilityLabel={`${question.title}, ${values[question.field]} of 5. Edit answer.`}
            accessibilityRole="button"
            key={question.field}
            onPress={() => onEdit(question.field)}
            style={({ pressed }) => [
              styles.answer,
              pressed ? styles.pressed : null,
            ]}
            testID={`daily-check-in-review-${question.field}`}
          >
            <View style={styles.answerCopy}>
              <Text style={styles.answerTitle}>{question.title}</Text>
              <Text style={styles.answerLabel}>
                {question.scaleLabels[values[question.field] - 1]}
              </Text>
            </View>
            <Text style={styles.answerValue}>{values[question.field]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          accessibilityLabel="Go back to the previous question"
          disabled={isSubmitting}
          label="Back"
          onPress={onBack}
          style={styles.actionButton}
          variant="ghost"
        />
        <Button
          accessibilityLabel={
            isEdit ? 'Update daily check-in' : 'Send daily check-in'
          }
          label={isEdit ? 'Update check-in' : 'Send check-in'}
          loading={isSubmitting}
          onPress={onSubmit}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 22,
  },
  copy: {
    gap: 8,
  },
  subtitle: {
    color: colors.mutedText,
  },
  answers: {
    gap: 10,
  },
  answer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  answerCopy: {
    flex: 1,
    gap: 3,
  },
  answerTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  answerLabel: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  answerValue: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
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
