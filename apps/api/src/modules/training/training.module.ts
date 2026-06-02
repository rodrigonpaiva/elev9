import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { FITNESS_PROFILE_REPOSITORY } from '../fitness/domain/repositories/fitness-profile.repository';
import { MongooseFitnessProfileRepository } from '../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository';
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from '../fitness/infrastructure/mongoose/fitness-profile.schema';
import { NUTRITION_LOG_REPOSITORY } from '../nutrition/domain/repositories/nutrition-log.repository';
import { NUTRITION_PLAN_REPOSITORY } from '../nutrition/domain/repositories/nutrition-plan.repository';
import { NUTRITION_RECOMMENDATION_REPOSITORY } from '../nutrition/domain/repositories/nutrition-recommendation.repository';
import { MongooseNutritionLogRepository } from '../nutrition/infrastructure/mongoose/mongoose-nutrition-log.repository';
import { MongooseNutritionPlanRepository } from '../nutrition/infrastructure/mongoose/mongoose-nutrition-plan.repository';
import { MongooseNutritionRecommendationRepository } from '../nutrition/infrastructure/mongoose/mongoose-nutrition-recommendation.repository';
import {
  NUTRITION_LOG_MODEL_NAME,
  NutritionLogSchema,
} from '../nutrition/infrastructure/mongoose/nutrition-log.schema';
import {
  NUTRITION_PLAN_MODEL_NAME as NUTRITION_PLAN_MODEL_NAME_SHARED,
  NutritionPlanSchema as NutritionPlanSchemaShared,
} from '../nutrition/infrastructure/mongoose/nutrition-plan.schema';
import {
  NUTRITION_RECOMMENDATION_MODEL_NAME,
  NutritionRecommendationSchema,
} from '../nutrition/infrastructure/mongoose/nutrition-recommendation.schema';
import { RECOVERY_SNAPSHOT_REPOSITORY } from '../recovery/domain/repositories/recovery-snapshot.repository';
import { MongooseRecoverySnapshotRepository } from '../recovery/infrastructure/mongoose/mongoose-recovery-snapshot.repository';
import {
  RECOVERY_SNAPSHOT_MODEL_NAME,
  RecoverySnapshotSchema,
} from '../recovery/infrastructure/mongoose/recovery-snapshot.schema';
import { USER_PROFILE_REPOSITORY } from '../users/domain/repositories/user-profile.repository';
import { MongooseUserProfileRepository } from '../users/infrastructure/mongoose/mongoose-user-profile.repository';
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from '../users/infrastructure/mongoose/user-profile.schema';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
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
    MongooseModule.forFeature([
      {
        name: USER_PROFILE_MODEL_NAME,
        schema: UserProfileSchema,
      },
      {
        name: FITNESS_PROFILE_MODEL_NAME,
        schema: FitnessProfileSchema,
      },
      {
        name: RECOVERY_SNAPSHOT_MODEL_NAME,
        schema: RecoverySnapshotSchema,
      },
      {
        name: NUTRITION_PLAN_MODEL_NAME_SHARED,
        schema: NutritionPlanSchemaShared,
      },
      {
        name: NUTRITION_LOG_MODEL_NAME,
        schema: NutritionLogSchema,
      },
      {
        name: NUTRITION_RECOMMENDATION_MODEL_NAME,
        schema: NutritionRecommendationSchema,
      },
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
    AdaptiveTrainingDateService,
    AdaptiveTrainingRecommendationCalculatorService,
    CreateTrainingPlanUseCase,
    BuildAdaptiveTrainingRecommendationUseCase,
    GetTodayAdaptiveTrainingUseCase,
    GetCurrentAdaptiveTrainingUseCase,
    GetAdaptiveTrainingHistoryUseCase,
    GetMyTrainingPlanUseCase,
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
    {
      provide: FITNESS_PROFILE_REPOSITORY,
      useClass: MongooseFitnessProfileRepository,
    },
    {
      provide: TRAINING_PLAN_REPOSITORY,
      useClass: MongooseTrainingPlanRepository,
    },
    {
      provide: RECOVERY_SNAPSHOT_REPOSITORY,
      useClass: MongooseRecoverySnapshotRepository,
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
    {
      provide: ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
      useClass: MongooseAdaptiveTrainingRecommendationRepository,
    },
  ],
  exports: [GetCurrentAdaptiveTrainingUseCase],
})
export class TrainingModule {}
