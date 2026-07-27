import type { SubmitDailyCheckInRequest } from '@elev9/types';

export type DailyCheckInField = keyof SubmitDailyCheckInRequest;
export type DailyCheckInMode = 'create' | 'edit';
export type DailyCheckInStatus = 'idle' | 'submitting' | 'success' | 'error';

export type DailyCheckInDraft = Partial<SubmitDailyCheckInRequest>;

export type DailyCheckInFormState = {
  step: number;
  values: DailyCheckInDraft;
  status: DailyCheckInStatus;
  errorMessage: string | null;
};

export const DAILY_CHECK_IN_QUESTION_COUNT = 4;
export const DAILY_CHECK_IN_REVIEW_STEP = DAILY_CHECK_IN_QUESTION_COUNT;
export const DAILY_CHECK_IN_MIN = 1;
export const DAILY_CHECK_IN_MAX = 5;

export function createDailyCheckInFormState(
  initialValues?: SubmitDailyCheckInRequest,
): DailyCheckInFormState {
  return {
    step: 0,
    values: initialValues ? { ...initialValues } : {},
    status: 'idle',
    errorMessage: null,
  };
}

export function setDailyCheckInAnswer(
  state: DailyCheckInFormState,
  field: DailyCheckInField,
  value: number,
): DailyCheckInFormState {
  return {
    ...state,
    values: {
      ...state.values,
      [field]: value,
    },
    errorMessage: null,
  };
}

export function isDailyCheckInComplete(
  values: DailyCheckInDraft,
): values is SubmitDailyCheckInRequest {
  return getMissingDailyCheckInField(values) === null;
}

export function getMissingDailyCheckInField(
  values: DailyCheckInDraft,
): DailyCheckInField | null {
  const fields: DailyCheckInField[] = [
    'energyLevel',
    'sleepQuality',
    'muscleSoreness',
    'motivationLevel',
  ];

  return (
    fields.find((field) => {
      const value = values[field];

      return (
        value === undefined ||
        !Number.isInteger(value) ||
        value < DAILY_CHECK_IN_MIN ||
        value > DAILY_CHECK_IN_MAX
      );
    }) ?? null
  );
}

export function getDailyCheckInProgress(step: number): number {
  return Math.min(
    1,
    Math.max(0, (step + 1) / (DAILY_CHECK_IN_REVIEW_STEP + 1)),
  );
}
