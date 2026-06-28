import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { calculateMacroTargets } from '../../services/macro-target-calculator.service';
import { generateNutritionPlanFoundation } from '../../services/nutrition-plan-generator.service';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../domain/repositories/nutrition-profile.repository';
import {
  CREATE_NUTRITION_PLAN_ERROR_CODES,
  CreateNutritionPlanError,
} from './create-nutrition-plan.errors';
import { CreateNutritionPlanOutput } from './create-nutrition-plan.output';

const FORMULA_VERSION = 'mifflin-st-jeor-v1';
const VALID_GOALS = new Set(['fat_loss', 'maintenance', 'muscle_gain']);
const VALID_ACTIVITY_LEVELS = new Set(['low', 'medium', 'high']);

@Injectable()
export class CreateNutritionPlanUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<CreateNutritionPlanOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateNutritionPlanError(
          CREATE_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new CreateNutritionPlanError(
          CREATE_NUTRITION_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionProfile) {
        throw new CreateNutritionPlanError(
          CREATE_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
          'Nutrition profile not found.',
        );
      }

      this.validateMinimumData({
        heightCm: fitnessProfile.heightCm,
        weightKg: fitnessProfile.weightKg,
        goal: nutritionProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
      });

      const macroResult = calculateMacroTargets({
        birthDate: userProfile.birthDate,
        gender: userProfile.gender,
        heightCm: fitnessProfile.heightCm,
        weightKg: fitnessProfile.weightKg,
        goal: nutritionProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
      });
      const weekStartDate = getCurrentWeekStartDateString(new Date());
      const generatedPlan = generateNutritionPlanFoundation({
        userProfileId: userProfile.id,
        nutritionProfileId: nutritionProfile.id,
        fitnessProfileId: fitnessProfile.id,
        weekStartDate,
        macroTargets: macroResult.macroTargets,
        mealsPerDay: nutritionProfile.mealsPerDay,
        goal: nutritionProfile.goal,
        dietaryRestrictions: nutritionProfile.dietaryRestrictions,
        allergies: nutritionProfile.allergies,
        dislikedFoods: nutritionProfile.dislikedFoods,
        preferredFoods: nutritionProfile.preferredFoods,
      });

      const nutritionPlan =
        await this.nutritionPlanRepository.replaceActiveByUserProfileId(
          userProfile.id,
          {
            userProfileId: generatedPlan.userProfileId,
            nutritionProfileId: generatedPlan.nutritionProfileId,
            fitnessProfileId: generatedPlan.fitnessProfileId,
            status: 'active',
            weekStartDate: generatedPlan.weekStartDate,
            weekEndDate: generatedPlan.weekEndDate,
            macroTargets: generatedPlan.macroTargets,
            days: generatedPlan.days,
            generatedBy: generatedPlan.generatedBy,
            sourceContext: {
              formulaVersion: FORMULA_VERSION,
              activityMultiplier: macroResult.calculation.activityMultiplier,
              goalAdjustment: macroResult.calculation.calorieAdjustment,
            },
          },
        );

      return { nutritionPlan };
    } catch (error) {
      if (error instanceof CreateNutritionPlanError) {
        throw error;
      }

      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private validateMinimumData(input: {
    heightCm: number;
    weightKg: number;
    goal: string;
    activityLevel: string;
  }): void {
    if (!VALID_GOALS.has(input.goal)) {
      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_GOAL,
        'Invalid nutrition goal.',
      );
    }

    if (!VALID_ACTIVITY_LEVELS.has(input.activityLevel)) {
      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_ACTIVITY_LEVEL,
        'Invalid activity level.',
      );
    }

    if (!isPositiveNumber(input.heightCm)) {
      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.HEIGHT_CM_MISSING,
        'Height is required to create a nutrition plan.',
      );
    }

    if (!isPositiveNumber(input.weightKg)) {
      throw new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.WEIGHT_KG_MISSING,
        'Weight is required to create a nutrition plan.',
      );
    }
  }
}

function getCurrentWeekStartDateString(now: Date): string {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const utcDay = start.getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;

  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  return start.toISOString().slice(0, 10);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
