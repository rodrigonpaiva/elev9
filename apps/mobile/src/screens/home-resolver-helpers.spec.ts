import { ApiClientError } from '@elev9/api-client';

import {
  getHomeResolverErrorMessage,
  getLocalDateKey,
  getNutritionPlanState,
  getNutritionProfileState,
  mapFitnessGoalToNutritionGoal,
  resolveHomeResolverDestination,
  shouldShowDailyBriefingToday,
} from './home-resolver-helpers';

function fulfilled<T>(value: T): PromiseFulfilledResult<T> {
  return {
    status: 'fulfilled',
    value,
  };
}

function rejected(code: string, message = 'Error'): PromiseRejectedResult {
  return {
    status: 'rejected',
    reason: new ApiClientError({
      code,
      message,
      status: 404,
    }),
  };
}

describe('home-resolver helpers', () => {
  const fitnessProfile = {
    id: 'fitness-1',
    goal: 'gain_muscle' as const,
    activityLevel: 'high' as const,
  };

  it('routes missing setup resources in the expected order', () => {
    expect(
      resolveHomeResolverDestination({
        hasUserProfile: false,
        fitnessProfile: null,
        trainingPlan: null,
        nutritionProfileState: 'unknown',
        nutritionPlanState: 'unknown',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({ screen: 'CreateProfile' });

    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile: null,
        trainingPlan: null,
        nutritionProfileState: 'unknown',
        nutritionPlanState: 'unknown',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({ screen: 'CreateFitnessProfile' });

    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile,
        trainingPlan: null,
        nutritionProfileState: 'unknown',
        nutritionPlanState: 'unknown',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({
      screen: 'CreateTrainingPlan',
      params: {
        fitnessProfileId: 'fitness-1',
        goal: 'gain_muscle',
        activityLevel: 'high',
      },
    });
  });

  it('routes to the home flow without requiring nutrition setup', () => {
    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile,
        trainingPlan: { id: 'plan-1' },
        nutritionProfileState: 'missing',
        nutritionPlanState: 'exists',
        nutritionGoal: 'fat_loss',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({ screen: 'CoachDailyBriefing' });

    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile,
        trainingPlan: { id: 'plan-1' },
        nutritionProfileState: 'exists',
        nutritionPlanState: 'missing',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({ screen: 'CoachDailyBriefing' });
  });

  it('routes to the daily briefing once per day and then to main tabs', () => {
    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile,
        trainingPlan: { id: 'plan-1' },
        nutritionProfileState: 'exists',
        nutritionPlanState: 'exists',
        shouldShowDailyBriefingToday: true,
      }),
    ).toEqual({ screen: 'CoachDailyBriefing' });

    expect(
      resolveHomeResolverDestination({
        hasUserProfile: true,
        fitnessProfile,
        trainingPlan: { id: 'plan-1' },
        nutritionProfileState: 'exists',
        nutritionPlanState: 'exists',
        shouldShowDailyBriefingToday: false,
      }),
    ).toEqual({ screen: 'MainTabs' });
  });

  it('derives nutrition states from API errors', () => {
    expect(getNutritionProfileState(fulfilled({}))).toBe('exists');
    expect(
      getNutritionProfileState(rejected('NUTRITION_PROFILE_NOT_FOUND')),
    ).toBe('missing');
    expect(getNutritionProfileState(rejected('SOMETHING_ELSE'))).toBe(
      'unknown',
    );

    expect(getNutritionPlanState(fulfilled({}))).toBe('exists');
    expect(getNutritionPlanState(rejected('NUTRITION_PLAN_NOT_FOUND'))).toBe(
      'missing',
    );
    expect(getNutritionPlanState(rejected('NUTRITION_PROFILE_NOT_FOUND'))).toBe(
      'missing',
    );
    expect(getNutritionPlanState(rejected('SOMETHING_ELSE'))).toBe('unknown');
  });

  it('detects same-day briefing safely', () => {
    expect(shouldShowDailyBriefingToday('2026-07-05', '2026-07-05')).toBe(
      false,
    );
    expect(shouldShowDailyBriefingToday('2026-07-04', '2026-07-05')).toBe(true);
    expect(shouldShowDailyBriefingToday(null, '2026-07-05')).toBe(true);
  });

  it('maps fitness goals to nutrition goals', () => {
    expect(mapFitnessGoalToNutritionGoal('lose_weight')).toBe('fat_loss');
    expect(mapFitnessGoalToNutritionGoal('gain_muscle')).toBe('muscle_gain');
    expect(mapFitnessGoalToNutritionGoal('maintain')).toBe('maintenance');
  });

  it('formats fallback error messages consistently', () => {
    expect(
      getHomeResolverErrorMessage(
        new ApiClientError({
          code: 'BAD_REQUEST',
          message: 'Invalid profile',
          status: 400,
        }),
      ),
    ).toBe('Invalid profile');

    expect(getHomeResolverErrorMessage(new Error('Boom'))).toBe(
      'Unable to set up your training space.',
    );
  });

  it('creates local date keys in yyyy-mm-dd format', () => {
    expect(getLocalDateKey(new Date(2026, 6, 5))).toBe('2026-07-05');
  });
});
