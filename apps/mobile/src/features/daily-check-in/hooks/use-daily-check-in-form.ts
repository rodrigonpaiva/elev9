import { useCallback, useMemo, useState } from 'react';

import type { SubmitDailyCheckInRequest } from '@elev9/types';

import {
  DAILY_CHECK_IN_QUESTIONS,
  type DailyCheckInQuestion,
} from '../constants/daily-check-in-questions';
import {
  createDailyCheckInFormState,
  DAILY_CHECK_IN_REVIEW_STEP,
  getMissingDailyCheckInField,
  isDailyCheckInComplete,
  setDailyCheckInAnswer,
  type DailyCheckInDraft,
  type DailyCheckInField,
  type DailyCheckInFormState,
} from '../models/daily-check-in-form-state';

export type DailyCheckInSubmit = (
  values: SubmitDailyCheckInRequest,
) => Promise<void> | void;

export type UseDailyCheckInFormOptions = {
  initialValues?: SubmitDailyCheckInRequest;
  onSubmit: DailyCheckInSubmit;
};

export function useDailyCheckInForm({
  initialValues,
  onSubmit,
}: UseDailyCheckInFormOptions) {
  const [state, setState] = useState<DailyCheckInFormState>(() =>
    createDailyCheckInFormState(initialValues),
  );

  const currentQuestion: DailyCheckInQuestion | null =
    state.step < DAILY_CHECK_IN_REVIEW_STEP
      ? DAILY_CHECK_IN_QUESTIONS[state.step]
      : null;
  const isComplete = isDailyCheckInComplete(state.values);
  const isDirty = Object.keys(state.values).length > 0;

  const selectAnswer = useCallback(
    (field: DailyCheckInField, value: number) => {
      setState((current) => setDailyCheckInAnswer(current, field, value));
    },
    [],
  );

  const goBack = useCallback(() => {
    setState((current) => ({
      ...current,
      step: Math.max(0, current.step - 1),
      status: 'idle',
      errorMessage: null,
    }));
  }, []);

  const goToReview = useCallback(() => {
    setState((current) => {
      if (!isDailyCheckInComplete(current.values)) {
        return {
          ...current,
          errorMessage: 'Choose an answer before continuing.',
        };
      }

      return {
        ...current,
        step: DAILY_CHECK_IN_REVIEW_STEP,
        errorMessage: null,
      };
    });
  }, []);

  const goToStep = useCallback((step: number) => {
    setState((current) => ({
      ...current,
      step: Math.max(0, Math.min(DAILY_CHECK_IN_REVIEW_STEP, step)),
      status: 'idle',
      errorMessage: null,
    }));
  }, []);

  const submit = useCallback(async () => {
    if (state.status === 'submitting') {
      return;
    }

    if (!isDailyCheckInComplete(state.values)) {
      setState((current) => ({
        ...current,
        errorMessage: 'Complete each question before sending your check-in.',
      }));
      return;
    }

    setState((current) => ({
      ...current,
      status: 'submitting',
      errorMessage: null,
    }));

    try {
      await onSubmit(state.values);
      setState((current) => ({
        ...current,
        status: 'success',
        errorMessage: null,
      }));
    } catch {
      setState((current) => ({
        ...current,
        status: 'error',
        errorMessage: 'We could not save your check-in. Please try again.',
      }));
    }
  }, [onSubmit, state.status, state.values]);

  const retry = useCallback(() => {
    setState((current) => ({
      ...current,
      status: 'idle',
      errorMessage: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(createDailyCheckInFormState(initialValues));
  }, [initialValues]);

  const draft = useMemo<DailyCheckInDraft>(
    () => ({ ...state.values }),
    [state.values],
  );

  return {
    ...state,
    currentQuestion,
    draft,
    isComplete,
    isDirty,
    missingField: getMissingDailyCheckInField(state.values),
    selectAnswer,
    goBack,
    goToReview,
    goToStep,
    submit,
    retry,
    reset,
  };
}
