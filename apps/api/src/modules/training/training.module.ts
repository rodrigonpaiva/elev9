import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { FITNESS_PROFILE_REPOSITORY } from '../fitness/domain/repositories/fitness-profile.repository';
import { MongooseFitnessProfileRepository } from '../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository';
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from '../fitness/infrastructure/mongoose/fitness-profile.schema';
import { USER_PROFILE_REPOSITORY } from '../users/domain/repositories/user-profile.repository';
import { MongooseUserProfileRepository } from '../users/infrastructure/mongoose/mongoose-user-profile.repository';
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from '../users/infrastructure/mongoose/user-profile.schema';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { CreateTrainingPlanUseCase } from './application/use-cases/create-training-plan/create-training-plan.use-case';
import { GetMyTrainingPlanUseCase } from './application/use-cases/get-my-training-plan/get-my-training-plan.use-case';
import { TRAINING_PLAN_REPOSITORY } from './domain/repositories/training-plan.repository';
import { MongooseTrainingPlanRepository } from './infrastructure/mongoose/mongoose-training-plan.repository';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from './infrastructure/mongoose/training-plan.schema';
import { TrainingController } from './presentation/http/training.controller';

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
        name: TRAINING_PLAN_MODEL_NAME,
        schema: TrainingPlanSchema,
      },
    ]),
  ],
  controllers: [TrainingController],
  providers: [
    AuthSessionGuard,
    CreateTrainingPlanUseCase,
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
  ],
})
export class TrainingModule {}
