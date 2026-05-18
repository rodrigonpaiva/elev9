import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { USER_PROFILE_REPOSITORY } from "../users/domain/repositories/user-profile.repository";
import { MongooseUserProfileRepository } from "../users/infrastructure/mongoose/mongoose-user-profile.repository";
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from "../users/infrastructure/mongoose/user-profile.schema";
import { AuthSessionGuard } from "../users/presentation/http/guards/auth-session.guard";
import { CreateNutritionProfileUseCase } from "./application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case";
import { GetNutritionProfileUseCase } from "./application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case";
import { NUTRITION_PROFILE_REPOSITORY } from "./domain/repositories/nutrition-profile.repository";
import { MongooseNutritionProfileRepository } from "./infrastructure/mongoose/mongoose-nutrition-profile.repository";
import {
  NUTRITION_PROFILE_MODEL_NAME,
  NutritionProfileSchema,
} from "./infrastructure/mongoose/nutrition-profile.schema";
import { NutritionController } from "./presentation/http/nutrition.controller";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: USER_PROFILE_MODEL_NAME,
        schema: UserProfileSchema,
      },
      {
        name: NUTRITION_PROFILE_MODEL_NAME,
        schema: NutritionProfileSchema,
      },
    ]),
  ],
  controllers: [NutritionController],
  providers: [
    AuthSessionGuard,
    CreateNutritionProfileUseCase,
    GetNutritionProfileUseCase,
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
    {
      provide: NUTRITION_PROFILE_REPOSITORY,
      useClass: MongooseNutritionProfileRepository,
    },
  ],
  exports: [NUTRITION_PROFILE_REPOSITORY],
})
export class NutritionModule {}
