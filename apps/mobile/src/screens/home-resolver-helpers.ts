import { ApiClientError } from '@elev9/api-client';

type FitnessGoal = 'lose_weight' | 'gain_muscle' | 'maintain';
type NutritionGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';
type ResourceState = 'exists' | 'missing' | 'unknown';

export type HomeResolverDestination =
  | {
      screen: 'CreateProfile';
    }
  | {
      screen: 'CreateFitnessProfile';
    }
  | {
      screen: 'CreateTrainingPlan';
      params: {
        fitnessProfileId: string;
        goal?: FitnessGoal;
        activityLevel?: 'low' | 'medium' | 'high';
      };
    }
  | {
      screen: 'CreateNutritionProfile';
      params?: {
        prefillGoal?: NutritionGoal;
      };
    }
  | {
      screen: 'CoachDailyBriefing';
    }
  | {
      screen: 'MainTabs';
    };

export function resolveHomeResolverDestination(input: {
  hasUserProfile: boolean;
  fitnessProfile: {
    id: string;
    goal: FitnessGoal;
    activityLevel: 'low' | 'medium' | 'high';
  } | null;
  trainingPlan: { id: string } | null;
  nutritionProfileState: ResourceState;
  nutritionPlanState: ResourceState;
  nutritionGoal?: NutritionGoal | null;
  shouldShowDailyBriefingToday: boolean;
}): HomeResolverDestination {
  if (!input.hasUserProfile) {
    return { screen: 'CreateProfile' };
  }

  if (!input.fitnessProfile) {
    return { screen: 'CreateFitnessProfile' };
  }

  if (!input.trainingPlan) {
    return {
      screen: 'CreateTrainingPlan',
      params: {
        fitnessProfileId: input.fitnessProfile.id,
        goal: input.fitnessProfile.goal,
        activityLevel: input.fitnessProfile.activityLevel,
      },
    };
  }

  if (
    input.nutritionProfileState === 'missing' ||
    input.nutritionPlanState === 'missing'
  ) {
    return {
      screen: 'CreateNutritionProfile',
      params: {
        prefillGoal:
          input.nutritionGoal ??
          mapFitnessGoalToNutritionGoal(input.fitnessProfile.goal),
      },
    };
  }

  if (input.shouldShowDailyBriefingToday) {
    return { screen: 'CoachDailyBriefing' };
  }

  return { screen: 'MainTabs' };
}

export function shouldShowDailyBriefingToday(
  lastShownDate: string | null | undefined,
  todayKey: string,
): boolean {
  return lastShownDate !== todayKey;
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function mapFitnessGoalToNutritionGoal(
  goal: FitnessGoal,
): NutritionGoal {
  switch (goal) {
    case 'lose_weight':
      return 'fat_loss';
    case 'gain_muscle':
      return 'muscle_gain';
    case 'maintain':
      return 'maintenance';
  }
}

export function getNutritionProfileState(
  result: PromiseSettledResult<unknown>,
): ResourceState {
  if (result.status === 'fulfilled') {
    return 'exists';
  }

  if (
    result.reason instanceof ApiClientError &&
    result.reason.code === 'NUTRITION_PROFILE_NOT_FOUND'
  ) {
    return 'missing';
  }

  return 'unknown';
}

export function getNutritionPlanState(
  result: PromiseSettledResult<unknown>,
): ResourceState {
  if (result.status === 'fulfilled') {
    return 'exists';
  }

  if (
    result.reason instanceof ApiClientError &&
    (result.reason.code === 'NUTRITION_PLAN_NOT_FOUND' ||
      result.reason.code === 'NUTRITION_PROFILE_NOT_FOUND')
  ) {
    return 'missing';
  }

  return 'unknown';
}

export function getHomeResolverErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to set up your training space.';
}
