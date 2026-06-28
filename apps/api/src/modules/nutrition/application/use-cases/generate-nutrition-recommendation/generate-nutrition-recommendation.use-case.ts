import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
import { NutritionGoal } from '../../../domain/entities/nutrition-profile.entity';
import {
  NutritionContextSnapshot,
  NutritionInfluence,
} from '../../../domain/entities/nutrition-recommendation.entity';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../domain/repositories/nutrition-profile.repository';
import {
  NUTRITION_RECOMMENDATION_REPOSITORY,
  NutritionRecommendationRepository,
} from '../../../domain/repositories/nutrition-recommendation.repository';
import {
  GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES,
  GenerateNutritionRecommendationError,
} from './generate-nutrition-recommendation.errors';
import { GenerateNutritionRecommendationOutput } from './generate-nutrition-recommendation.output';

const GENERATOR_VERSION = 'nutrition-deterministic-v1';

@Injectable()
export class GenerateNutritionRecommendationUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
    @Inject(NUTRITION_RECOMMENDATION_REPOSITORY)
    private readonly nutritionRecommendationRepository: NutritionRecommendationRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GenerateNutritionRecommendationOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GenerateNutritionRecommendationError(
        GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GenerateNutritionRecommendationError(
          GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionProfile) {
        throw new GenerateNutritionRecommendationError(
          GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
          'Nutrition profile not found.',
        );
      }

      const plan = await this.nutritionPlanRepository.findActiveByUserProfileId(
        userProfile.id,
      );

      if (!plan) {
        throw new GenerateNutritionRecommendationError(
          GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
          'Active nutrition plan not found.',
        );
      }

      const today = toUtcDateString(new Date());
      const todayDay = plan.days.find((day) => day.date === today);
      const logs =
        await this.nutritionLogRepository.findByUserProfileIdAndDateRange(
          userProfile.id,
          plan.weekStartDate,
          plan.weekEndDate,
        );
      const todayLogs = logs.filter((log) => log.date === today);
      const consumed = sumLogs(todayLogs);
      const totalMeals = todayDay?.meals.length ?? 0;
      const caloriesPercent = percent(
        consumed.calories,
        plan.macroTargets.calories,
      );
      const proteinPercent = percent(
        consumed.proteinGrams,
        plan.macroTargets.proteinGrams,
      );
      const influences = buildInfluences({
        goal: nutritionProfile.goal,
        logs: todayLogs,
        caloriesPercent,
        proteinPercent,
      });
      const recommendations = buildRecommendations(influences);
      const message = buildMessage(nutritionProfile.goal, influences);
      const contextSnapshot: NutritionContextSnapshot = {
        goal: nutritionProfile.goal,
        adherenceScore: caloriesPercent,
        todayNutrition: {
          mealsLogged: todayLogs.length,
          totalMeals,
          caloriesPercent,
          proteinPercent,
        },
      };
      const recommendation =
        await this.nutritionRecommendationRepository.create({
          userProfileId: userProfile.id,
          message,
          recommendations,
          influences,
          generatorVersion: GENERATOR_VERSION,
          contextSnapshot,
        });

      return { nutritionRecommendation: recommendation };
    } catch (error) {
      if (error instanceof GenerateNutritionRecommendationError) {
        throw error;
      }

      throw new GenerateNutritionRecommendationError(
        GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function buildInfluences(input: {
  goal: NutritionGoal;
  logs: NutritionLog[];
  caloriesPercent: number;
  proteinPercent: number;
}): NutritionInfluence[] {
  const influences: NutritionInfluence[] = [];

  if (input.logs.length === 0) {
    influences.push('NO_LOGS_YET');
  }

  if (input.caloriesPercent < 60) {
    influences.push('LOW_CALORIE_ADHERENCE');
  }

  if (input.proteinPercent < 70) {
    influences.push('PROTEIN_TARGET_MISSED');
  }

  if (input.logs.some((log) => log.status === 'skipped')) {
    influences.push('SKIPPED_MEALS');
  }

  if (input.logs.some((log) => log.status === 'partial')) {
    influences.push('PARTIAL_MEALS');
  }

  if (input.goal === 'fat_loss') {
    influences.push('FAT_LOSS_DEFICIT_FOCUS');
  } else if (input.goal === 'muscle_gain') {
    influences.push('MUSCLE_GAIN_SURPLUS_FOCUS');
  } else {
    influences.push('MAINTENANCE_CONSISTENCY_FOCUS');
  }

  return influences;
}

function buildRecommendations(influences: NutritionInfluence[]): string[] {
  const recommendations: string[] = [];

  if (influences.includes('NO_LOGS_YET')) {
    recommendations.push('Log your first meal to make today measurable.');
  }
  if (influences.includes('LOW_CALORIE_ADHERENCE')) {
    recommendations.push(
      'Prioritize the next planned meal to close the calorie gap.',
    );
  }
  if (influences.includes('PROTEIN_TARGET_MISSED')) {
    recommendations.push('Choose a protein-forward option in your next meal.');
  }
  if (influences.includes('SKIPPED_MEALS')) {
    recommendations.push(
      'Avoid stacking skipped meals; use a lighter planned option if needed.',
    );
  }
  if (influences.includes('PARTIAL_MEALS')) {
    recommendations.push(
      'Use partial meals intentionally and keep the next meal balanced.',
    );
  }
  if (influences.includes('FAT_LOSS_DEFICIT_FOCUS')) {
    recommendations.push(
      'Keep the deficit controlled and protect protein intake.',
    );
  }
  if (influences.includes('MUSCLE_GAIN_SURPLUS_FOCUS')) {
    recommendations.push(
      'Keep the surplus clean and distribute protein across meals.',
    );
  }
  if (influences.includes('MAINTENANCE_CONSISTENCY_FOCUS')) {
    recommendations.push('Stay consistent with planned meals and portions.');
  }

  return recommendations;
}

function buildMessage(
  goal: NutritionGoal,
  influences: NutritionInfluence[],
): string {
  if (influences.includes('NO_LOGS_YET')) {
    return 'Start with the first planned meal and log it to establish today’s baseline.';
  }

  if (goal === 'fat_loss') {
    return 'Keep today focused on a controlled deficit with enough protein.';
  }

  if (goal === 'muscle_gain') {
    return 'Keep today focused on a clean surplus and steady protein.';
  }

  return 'Keep today focused on consistent intake and balanced meals.';
}

function sumLogs(logs: NutritionLog[]) {
  return logs.reduce(
    (accumulator, log) => {
      if (!log.actualMacros || log.status === 'skipped') {
        return accumulator;
      }

      return {
        calories: accumulator.calories + log.actualMacros.calories,
        proteinGrams: accumulator.proteinGrams + log.actualMacros.proteinGrams,
      };
    },
    {
      calories: 0,
      proteinGrams: 0,
    },
  );
}

function percent(actual: number, target: number): number {
  if (target <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((actual / target) * 100));
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
