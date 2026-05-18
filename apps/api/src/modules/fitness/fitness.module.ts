import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { USER_PROFILE_REPOSITORY } from '../users/domain/repositories/user-profile.repository';
import { MongooseUserProfileRepository } from '../users/infrastructure/mongoose/mongoose-user-profile.repository';
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from '../users/infrastructure/mongoose/user-profile.schema';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { CreateFitnessProfileUseCase } from './application/use-cases/create-fitness-profile/create-fitness-profile.use-case';
import { GetMyFitnessProfileUseCase } from './application/use-cases/get-my-fitness-profile/get-my-fitness-profile.use-case';
import { FITNESS_PROFILE_REPOSITORY } from './domain/repositories/fitness-profile.repository';
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from './infrastructure/mongoose/fitness-profile.schema';
import { MongooseFitnessProfileRepository } from './infrastructure/mongoose/mongoose-fitness-profile.repository';
import { FitnessController } from './presentation/http/fitness.controller';

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
    ]),
  ],
  controllers: [FitnessController],
  providers: [
    AuthSessionGuard,
    CreateFitnessProfileUseCase,
    GetMyFitnessProfileUseCase,
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
    {
      provide: FITNESS_PROFILE_REPOSITORY,
      useClass: MongooseFitnessProfileRepository,
    },
  ],
})
export class FitnessModule {}
