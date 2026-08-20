import { Inject, Injectable } from '@nestjs/common';

import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../domain/repositories/nutrition-log.repository';
import { GetTodayNutritionUseCase } from '../use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GetTodayNutritionError } from '../use-cases/get-today-nutrition/get-today-nutrition.errors';
import { GET_TODAY_NUTRITION_ERROR_CODES } from '../use-cases/get-today-nutrition/get-today-nutrition.errors';

export const NUTRITION_COACH_CONTEXT_PORT = Symbol(
  'NUTRITION_COACH_CONTEXT_PORT',
);
export const NUTRITION_TRAINING_SIGNALS_PORT = Symbol(
  'NUTRITION_TRAINING_SIGNALS_PORT',
);
export const NUTRITION_GOAL_SIGNALS_PORT = Symbol(
  'NUTRITION_GOAL_SIGNALS_PORT',
);
export const NUTRITION_NOTIFICATION_SIGNALS_PORT = Symbol(
  'NUTRITION_NOTIFICATION_SIGNALS_PORT',
);

export type NutritionConsumerAvailability =
  | 'available'
  | 'not_configured'
  | 'insufficient_data'
  | 'not_available'
  | 'processing_failed';

export type NutritionCoachContextPort = {
  execute(input: { authUserId: string }): Promise<{
    todayNutrition:
      | Awaited<
          ReturnType<GetTodayNutritionUseCase['execute']>
        >['todayNutrition']
      | null;
    availability: NutritionConsumerAvailability;
  }>;
};

export type TrainingNutritionSignals = {
  availability: NutritionConsumerAvailability;
  freshness: 'current' | 'stale' | 'legacy' | 'unknown';
  adherencePercentage: number | null;
  contractVersion: 'nutrition-consumer-signals-v1';
};

export type GoalNutritionSignals = {
  availability: NutritionConsumerAvailability;
  recentLoggedDays: number;
  hasActivePlan: boolean;
  contractVersion: 'nutrition-consumer-signals-v1';
};

export type NotificationNutritionSignals = {
  availability: NutritionConsumerAvailability;
  adherencePercentage: number | null;
  contractVersion: 'nutrition-consumer-signals-v1';
};

function mapTodayError(error: unknown): NutritionConsumerAvailability {
  if (!(error instanceof GetTodayNutritionError)) return 'processing_failed';
  switch (error.code) {
    case GET_TODAY_NUTRITION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
    case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
      return 'not_configured';
    case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_DAY_NOT_FOUND:
      return 'insufficient_data';
    default:
      return 'processing_failed';
  }
}

@Injectable()
export class NutritionConsumerProjectionService {
  constructor(
    private readonly getTodayNutritionUseCase: GetTodayNutritionUseCase,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async execute(input: { authUserId: string }) {
    return this.getCoachContext(input);
  }

  async getCoachContext(
    input: NutritionCoachContextPort['execute'] extends (
      input: infer T,
    ) => unknown
      ? T
      : never,
  ) {
    try {
      const result = await this.getTodayNutritionUseCase.execute(input);
      return {
        todayNutrition: result.todayNutrition,
        availability: 'available' as const,
      };
    } catch (error) {
      return { todayNutrition: null, availability: mapTodayError(error) };
    }
  }

  async getTrainingSignals(input: {
    authUserId: string;
  }): Promise<TrainingNutritionSignals> {
    const context = await this.getCoachContext(input);
    return {
      availability: context.availability,
      freshness: context.todayNutrition?.freshness ?? 'unknown',
      adherencePercentage:
        context.todayNutrition?.progress?.adherencePercentage ?? null,
      contractVersion: 'nutrition-consumer-signals-v1',
    };
  }

  async getGoalSignals(input: {
    authUserId: string;
    userProfileId: string;
    startDate: string;
    endDate: string;
  }): Promise<GoalNutritionSignals> {
    const logs =
      await this.nutritionLogRepository.findByUserProfileIdAndDateRange(
        input.userProfileId,
        input.startDate,
        input.endDate,
      );
    const dates = new Set(logs.map((log: NutritionLog) => log.date));
    const today = await this.getCoachContext({ authUserId: input.authUserId });
    return {
      availability: today.availability,
      recentLoggedDays: dates.size,
      hasActivePlan: today.todayNutrition !== null,
      contractVersion: 'nutrition-consumer-signals-v1',
    };
  }

  async getNotificationSignals(input: {
    authUserId: string;
  }): Promise<NotificationNutritionSignals> {
    const context = await this.getCoachContext(input);
    return {
      availability: context.availability,
      adherencePercentage:
        context.todayNutrition?.progress?.adherencePercentage ?? null,
      contractVersion: 'nutrition-consumer-signals-v1',
    };
  }
}
