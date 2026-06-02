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
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../domain/repositories/nutrition-profile.repository';
import {
  CALCULATE_MACRO_TARGETS_ERROR_CODES,
  CalculateMacroTargetsError,
} from './calculate-macro-targets.errors';
import { CalculateMacroTargetsOutput } from './calculate-macro-targets.output';

const FORMULA_VERSION = 'mifflin-st-jeor-v1';
const VALID_GOALS = new Set(['fat_loss', 'maintenance', 'muscle_gain']);
const VALID_ACTIVITY_LEVELS = new Set(['low', 'medium', 'high']);

@Injectable()
export class CalculateMacroTargetsUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<CalculateMacroTargetsOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CalculateMacroTargetsError(
          CALCULATE_MACRO_TARGETS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        throw new CalculateMacroTargetsError(
          CALCULATE_MACRO_TARGETS_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
          'Fitness profile not found.',
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionProfile) {
        throw new CalculateMacroTargetsError(
          CALCULATE_MACRO_TARGETS_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
          'Nutrition profile not found.',
        );
      }

      this.validateMinimumData({
        heightCm: fitnessProfile.heightCm,
        weightKg: fitnessProfile.weightKg,
        goal: nutritionProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
      });

      const result = calculateMacroTargets({
        birthDate: userProfile.birthDate,
        gender: userProfile.gender,
        heightCm: fitnessProfile.heightCm,
        weightKg: fitnessProfile.weightKg,
        goal: nutritionProfile.goal,
        activityLevel: fitnessProfile.activityLevel,
      });

      return {
        macroTargets: {
          calories: result.macroTargets.calories,
          proteinGrams: result.macroTargets.proteinGrams,
          carbsGrams: result.macroTargets.carbsGrams,
          fatGrams: result.macroTargets.fatGrams,
          formulaVersion: FORMULA_VERSION,
          activityMultiplier: result.calculation.activityMultiplier,
          goalAdjustment: result.calculation.calorieAdjustment,
          calculatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof CalculateMacroTargetsError) {
        throw error;
      }

      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.INTERNAL_ERROR,
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
      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_GOAL,
        'Invalid nutrition goal.',
      );
    }

    if (!VALID_ACTIVITY_LEVELS.has(input.activityLevel)) {
      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_ACTIVITY_LEVEL,
        'Invalid activity level.',
      );
    }

    if (!isPositiveNumber(input.heightCm)) {
      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.HEIGHT_CM_MISSING,
        'Height is required to calculate macro targets.',
      );
    }

    if (!isPositiveNumber(input.weightKg)) {
      throw new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.WEIGHT_KG_MISSING,
        'Weight is required to calculate macro targets.',
      );
    }
  }
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
