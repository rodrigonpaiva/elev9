import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { FitnessModule } from '../fitness/fitness.module';
import { UsersModule } from '../users/users.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { CalculateMacroTargetsUseCase } from './application/use-cases/calculate-macro-targets/calculate-macro-targets.use-case';
import { CreateNutritionPlanUseCase } from './application/use-cases/create-nutrition-plan/create-nutrition-plan.use-case';
import { CreateNutritionProfileUseCase } from './application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case';
import { GetCurrentNutritionPlanUseCase } from './application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import { GetNutritionProfileUseCase } from './application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case';
import { GetNutritionRecommendationsUseCase } from './application/use-cases/get-nutrition-recommendations/get-nutrition-recommendations.use-case';
import { GetTodayNutritionUseCase } from './application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GenerateNutritionRecommendationUseCase } from './application/use-cases/generate-nutrition-recommendation/generate-nutrition-recommendation.use-case';
import { LogMealUseCase } from './application/use-cases/log-meal/log-meal.use-case';
import { ReplaceMealUseCase } from './application/use-cases/replace-meal/replace-meal.use-case';
import { NUTRITION_LOG_REPOSITORY } from './domain/repositories/nutrition-log.repository';
import { NUTRITION_PLAN_REPOSITORY } from './domain/repositories/nutrition-plan.repository';
import { NUTRITION_PROFILE_REPOSITORY } from './domain/repositories/nutrition-profile.repository';
import { NUTRITION_RECOMMENDATION_REPOSITORY } from './domain/repositories/nutrition-recommendation.repository';
import { MongooseNutritionLogRepository } from './infrastructure/mongoose/mongoose-nutrition-log.repository';
import { MongooseNutritionPlanRepository } from './infrastructure/mongoose/mongoose-nutrition-plan.repository';
import { MongooseNutritionProfileRepository } from './infrastructure/mongoose/mongoose-nutrition-profile.repository';
import { MongooseNutritionRecommendationRepository } from './infrastructure/mongoose/mongoose-nutrition-recommendation.repository';
import {
  NUTRITION_LOG_MODEL_NAME,
  NutritionLogSchema,
} from './infrastructure/mongoose/nutrition-log.schema';
import {
  NUTRITION_PLAN_MODEL_NAME,
  NutritionPlanSchema,
} from './infrastructure/mongoose/nutrition-plan.schema';
import {
  NUTRITION_RECOMMENDATION_MODEL_NAME,
  NutritionRecommendationSchema,
} from './infrastructure/mongoose/nutrition-recommendation.schema';
import {
  NUTRITION_PROFILE_MODEL_NAME,
  NutritionProfileSchema,
} from './infrastructure/mongoose/nutrition-profile.schema';
import { NutritionController } from './presentation/http/nutrition.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    MongooseModule.forFeature([
      {
        name: NUTRITION_PROFILE_MODEL_NAME,
        schema: NutritionProfileSchema,
      },
      {
        name: NUTRITION_PLAN_MODEL_NAME,
        schema: NutritionPlanSchema,
      },
      {
        name: NUTRITION_LOG_MODEL_NAME,
        schema: NutritionLogSchema,
      },
      {
        name: NUTRITION_RECOMMENDATION_MODEL_NAME,
        schema: NutritionRecommendationSchema,
      },
    ]),
  ],
  controllers: [NutritionController],
  providers: [
    AuthSessionGuard,
    CalculateMacroTargetsUseCase,
    CreateNutritionPlanUseCase,
    CreateNutritionProfileUseCase,
    GetCurrentNutritionPlanUseCase,
    GetNutritionProfileUseCase,
    GetNutritionRecommendationsUseCase,
    GetTodayNutritionUseCase,
    GenerateNutritionRecommendationUseCase,
    LogMealUseCase,
    ReplaceMealUseCase,
    {
      provide: NUTRITION_PROFILE_REPOSITORY,
      useClass: MongooseNutritionProfileRepository,
    },
    {
      provide: NUTRITION_PLAN_REPOSITORY,
      useClass: MongooseNutritionPlanRepository,
    },
    {
      provide: NUTRITION_LOG_REPOSITORY,
      useClass: MongooseNutritionLogRepository,
    },
    {
      provide: NUTRITION_RECOMMENDATION_REPOSITORY,
      useClass: MongooseNutritionRecommendationRepository,
    },
  ],
  exports: [
    NUTRITION_PROFILE_REPOSITORY,
    NUTRITION_PLAN_REPOSITORY,
    NUTRITION_LOG_REPOSITORY,
    NUTRITION_RECOMMENDATION_REPOSITORY,
    GetCurrentNutritionPlanUseCase,
    GetNutritionRecommendationsUseCase,
    GetTodayNutritionUseCase,
  ],
})
export class NutritionModule {}
