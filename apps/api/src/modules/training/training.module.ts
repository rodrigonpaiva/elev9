import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { FitnessModule } from '../fitness/fitness.module';
import { ProgressModule } from '../progress/progress.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { AdaptiveTrainingDateService } from './application/services/adaptive-training-date.service';
import { CreateTrainingPlanUseCase } from './application/use-cases/create-training-plan/create-training-plan.use-case';
import { BuildAdaptiveTrainingRecommendationUseCase } from './application/use-cases/build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case';
import { GetTodayAdaptiveTrainingUseCase } from './application/use-cases/get-today-adaptive-training/get-today-adaptive-training.use-case';
import { GetCurrentAdaptiveTrainingUseCase } from './application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import { GetAdaptiveTrainingHistoryUseCase } from './application/use-cases/get-adaptive-training-history/get-adaptive-training-history.use-case';
import { GetMyTrainingPlanUseCase } from './application/use-cases/get-my-training-plan/get-my-training-plan.use-case';
import { AdaptiveTrainingRecommendationCalculatorService } from './application/services/adaptive-training-recommendation-calculator.service';
import { TRAINING_PLAN_REPOSITORY } from './domain/repositories/training-plan.repository';
import { MongooseTrainingPlanRepository } from './infrastructure/mongoose/mongoose-training-plan.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME,
  AdaptiveTrainingRecommendationSchema,
} from './infrastructure/mongoose/adaptive-training-recommendation.schema';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from './infrastructure/mongoose/training-plan.schema';
import { ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY } from './domain/repositories/adaptive-training-recommendation.repository';
import { MongooseAdaptiveTrainingRecommendationRepository } from './infrastructure/mongoose/mongoose-adaptive-training-recommendation.repository';
import { TrainingController } from './presentation/http/training.controller';
import { AdaptiveTrainingController } from './presentation/http/adaptive-training.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    ProgressModule,
    RecoveryModule,
    NutritionModule,
    MongooseModule.forFeature([
      {
        name: TRAINING_PLAN_MODEL_NAME,
        schema: TrainingPlanSchema,
      },
      {
        name: ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME,
        schema: AdaptiveTrainingRecommendationSchema,
      },
    ]),
  ],
  controllers: [TrainingController, AdaptiveTrainingController],
  providers: [
    AuthSessionGuard,
    PlatformDateService,
    AdaptiveTrainingDateService,
    AdaptiveTrainingRecommendationCalculatorService,
    CreateTrainingPlanUseCase,
    BuildAdaptiveTrainingRecommendationUseCase,
    GetTodayAdaptiveTrainingUseCase,
    GetCurrentAdaptiveTrainingUseCase,
    GetAdaptiveTrainingHistoryUseCase,
    GetMyTrainingPlanUseCase,
    {
      provide: TRAINING_PLAN_REPOSITORY,
      useClass: MongooseTrainingPlanRepository,
    },
    {
      provide: ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
      useClass: MongooseAdaptiveTrainingRecommendationRepository,
    },
  ],
  exports: [
    GetCurrentAdaptiveTrainingUseCase,
    GetMyTrainingPlanUseCase,
    TRAINING_PLAN_REPOSITORY,
    ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  ],
})
export class TrainingModule {}
