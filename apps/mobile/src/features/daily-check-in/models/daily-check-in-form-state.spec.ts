import type { SubmitDailyCheckInRequest } from '@elev9/types';

import {
  createDailyCheckInFormState,
  DAILY_CHECK_IN_REVIEW_STEP,
  getDailyCheckInProgress,
  getMissingDailyCheckInField,
  isDailyCheckInComplete,
  setDailyCheckInAnswer,
} from './daily-check-in-form-state';

const completeDraft: SubmitDailyCheckInRequest = {
  energyLevel: 4,
  sleepQuality: 3,
  muscleSoreness: 2,
  motivationLevel: 5,
};

describe('daily check-in form state', () => {
  it('starts empty and at the first question', () => {
    expect(createDailyCheckInFormState()).toEqual({
      step: 0,
      values: {},
      status: 'idle',
      errorMessage: null,
    });
  });

  it('hydrates edit mode values without adding transport metadata', () => {
    expect(createDailyCheckInFormState(completeDraft).values).toEqual(
      completeDraft,
    );
  });

  it('preserves existing answers while selecting a new value', () => {
    const state = setDailyCheckInAnswer(
      setDailyCheckInAnswer(createDailyCheckInFormState(), 'energyLevel', 2),
      'sleepQuality',
      5,
    );

    expect(state.values).toEqual({ energyLevel: 2, sleepQuality: 5 });
  });

  it('requires every signal to be selected within the backend range', () => {
    expect(isDailyCheckInComplete(completeDraft)).toBe(true);
    expect(Object.keys(completeDraft)).toEqual([
      'energyLevel',
      'sleepQuality',
      'muscleSoreness',
      'motivationLevel',
    ]);
    expect(
      getMissingDailyCheckInField({ ...completeDraft, muscleSoreness: 6 }),
    ).toBe('muscleSoreness');
    expect(getMissingDailyCheckInField({})).toBe('energyLevel');
  });

  it('keeps soreness direction explicit: higher values remain valid', () => {
    expect(
      isDailyCheckInComplete({ ...completeDraft, muscleSoreness: 5 }),
    ).toBe(true);
  });

  it('maps the question and review steps to bounded progress', () => {
    expect(getDailyCheckInProgress(0)).toBe(0.2);
    expect(getDailyCheckInProgress(DAILY_CHECK_IN_REVIEW_STEP)).toBe(1);
    expect(getDailyCheckInProgress(99)).toBe(1);
  });
});
