import { useEffect, StyleSheet, View } from 'react-native';

import { Button, colors, Screen, Text } from '@elev9/ui';

import { DAILY_CHECK_IN_QUESTIONS } from '../constants/daily-check-in-questions';
import {
  getDailyCheckInProgress,
  DAILY_CHECK_IN_REVIEW_STEP,
} from '../models/daily-check-in-form-state';
import { useDailyCheckInForm } from '../hooks/use-daily-check-in-form';
import { DailyCheckInError } from './daily-check-in-error';
import { DailyCheckInQuestion } from './daily-check-in-question';
import { DailyCheckInReview } from './daily-check-in-review';
import { DailyCheckInSuccess } from './daily-check-in-success';
import type {
  DailyCheckInMode,
  DailyCheckInField,
} from '../models/daily-check-in-form-state';
import type { SubmitDailyCheckInRequest } from '@elev9/types';
import type { DailyCheckInSubmit } from '../hooks/use-daily-check-in-form';

export type DailyCheckInFlowProps = {
  mode?: DailyCheckInMode;
  initialValues?: SubmitDailyCheckInRequest;
  onSubmit: DailyCheckInSubmit;
  onClose: () => void;
  onDone: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
};

export function DailyCheckInFlow({
  mode = 'create',
  initialValues,
  onSubmit,
  onClose,
  onDone,
  onDirtyChange,
}: DailyCheckInFlowProps) {
  const form = useDailyCheckInForm({ initialValues, onSubmit });
  const progress = getDailyCheckInProgress(form.step);
  const isReview = form.step === DAILY_CHECK_IN_REVIEW_STEP;
  const currentQuestion = form.currentQuestion;

  useEffect(() => {
    onDirtyChange?.(form.isDirty && form.status !== 'success');
  }, [form.isDirty, form.status, onDirtyChange]);

  return (
    <Screen contentStyle={styles.content} scroll>
      <View style={styles.stack} testID="daily-check-in-flow">
        <View style={styles.header}>
          <Button
            accessibilityLabel="Close daily check-in"
            label="Close"
            onPress={onClose}
            style={styles.closeButton}
            variant="ghost"
          />
          <View style={styles.headerCopy}>
            <Text variant="label">Daily check-in</Text>
            <Text
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 1, now: progress }}
              style={styles.progressText}
            >
              {isReview
                ? 'Review your answers'
                : `Question ${form.step + 1} of ${DAILY_CHECK_IN_QUESTIONS.length}`}
            </Text>
          </View>
          <View
            accessibilityLabel={`${Math.round(progress * 100)} percent complete`}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(progress * 100),
            }}
            style={styles.progressTrack}
          >
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        {form.status === 'success' ? (
          <DailyCheckInSuccess isEdit={mode === 'edit'} onDone={onDone} />
        ) : form.status === 'error' ? (
          <DailyCheckInError
            message={form.errorMessage ?? 'Please try again.'}
            onBack={() => form.retry()}
            onRetry={() => void form.submit()}
          />
        ) : (
          <>
            <View style={styles.intro}>
              <Text variant="headline" style={styles.title}>
                {mode === 'edit'
                  ? 'Update how you feel today.'
                  : 'How are you feeling today?'}
              </Text>
              <Text style={styles.subtitle}>
                Your answers help your Coach adjust today&apos;s plan.
              </Text>
            </View>

            {currentQuestion ? (
              <DailyCheckInQuestion
                canGoBack={form.step > 0}
                errorMessage={form.errorMessage}
                onBack={form.goBack}
                onChange={(value) =>
                  form.selectAnswer(currentQuestion.field, value)
                }
                onContinue={
                  form.step === DAILY_CHECK_IN_QUESTIONS.length - 1
                    ? form.goToReview
                    : () => form.goToStep(form.step + 1)
                }
                question={currentQuestion}
                value={form.values[currentQuestion.field]}
              />
            ) : (
              <DailyCheckInReview
                isEdit={mode === 'edit'}
                isSubmitting={form.status === 'submitting'}
                onBack={form.goBack}
                onEdit={(field: DailyCheckInField) =>
                  form.goToStep(
                    DAILY_CHECK_IN_QUESTIONS.findIndex(
                      (item) => item.field === field,
                    ),
                  )
                }
                onSubmit={() => void form.submit()}
                values={form.values as SubmitDailyCheckInRequest}
              />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  stack: {
    gap: 22,
  },
  header: {
    gap: 12,
  },
  closeButton: {
    minWidth: 80,
    width: 80,
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  headerCopy: {
    gap: 4,
  },
  progressText: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  intro: {
    gap: 8,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.mutedText,
  },
});
