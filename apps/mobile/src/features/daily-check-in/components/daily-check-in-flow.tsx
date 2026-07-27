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
import type { DailyCheckInAnalytics } from '../hooks/use-daily-check-in-analytics';
import type { DailyCheckInAnalyticsErrorCategory } from '../models/daily-check-in-analytics';

export type DailyCheckInFlowProps = {
  mode?: DailyCheckInMode;
  initialValues?: SubmitDailyCheckInRequest;
  onSubmit: DailyCheckInSubmit;
  onClose: () => void;
  onDone: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  analytics?: DailyCheckInAnalytics;
  analyticsErrorCategory?: DailyCheckInAnalyticsErrorCategory;
  entryPoint?: 'dashboard' | 'other';
};

export function DailyCheckInFlow({
  mode = 'create',
  initialValues,
  onSubmit,
  onClose,
  onDone,
  onDirtyChange,
  analytics,
  analyticsErrorCategory = 'unknown',
  entryPoint = 'other',
}: DailyCheckInFlowProps) {
  const form = useDailyCheckInForm({ initialValues, onSubmit });
  const progress = getDailyCheckInProgress(form.step);
  const isReview = form.step === DAILY_CHECK_IN_REVIEW_STEP;
  const currentQuestion = form.currentQuestion;

  useEffect(() => {
    analytics?.start(mode, entryPoint);
    const step = currentQuestion?.field ?? 'review';
    analytics?.stepViewed(mode, step, form.step);
  }, [analytics, currentQuestion?.field, entryPoint, form.step, mode]);

  useEffect(() => {
    if (form.status === 'success') {
      analytics?.successViewed(mode);
    }
  }, [analytics, form.status, mode]);

  useEffect(() => {
    onDirtyChange?.(form.isDirty && form.status !== 'success');
  }, [form.isDirty, form.status, onDirtyChange]);

  const handleClose = () => {
    analytics?.exited(
      mode,
      currentQuestion?.field ?? 'review',
      form.status === 'success',
      form.isDirty,
    );
    onClose();
  };

  const handleDone = () => {
    analytics?.exited(mode, 'review', true, false);
    onDone();
  };

  const handleContinue = () => {
    const step = currentQuestion?.field;
    if (!step) {
      return;
    }

    analytics?.stepCompleted(mode, step, form.step);
    if (form.step === DAILY_CHECK_IN_QUESTIONS.length - 1) {
      form.goToReview();
      return;
    }

    form.goToStep(form.step + 1);
  };

  const handleRetry = () => {
    analytics?.retrySelected(mode, analyticsErrorCategory);
    void form.submit();
  };

  const handleSubmit = () => {
    analytics?.stepCompleted(mode, 'review', DAILY_CHECK_IN_REVIEW_STEP);
    void form.submit();
  };

  return (
    <Screen contentStyle={styles.content} scroll>
      <View style={styles.stack} testID="daily-check-in-flow">
        <View style={styles.header}>
          <Button
            accessibilityLabel="Close daily check-in"
            label="Close"
            onPress={handleClose}
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
          <DailyCheckInSuccess isEdit={mode === 'edit'} onDone={handleDone} />
        ) : form.status === 'error' ? (
          <DailyCheckInError
            message={form.errorMessage ?? 'Please try again.'}
            onBack={() => form.retry()}
            onRetry={handleRetry}
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
                onContinue={handleContinue}
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
                onSubmit={handleSubmit}
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
