import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { CreateUserProfileUseCase } from "./application/use-cases/create-user-profile/create-user-profile.use-case";
import {
  USER_PROFILE_REPOSITORY,
} from "./domain/repositories/user-profile.repository";
import { MongooseUserProfileRepository } from "./infrastructure/mongoose/mongoose-user-profile.repository";
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from "./infrastructure/mongoose/user-profile.schema";
import { UsersController } from "./presentation/http/users.controller";
import { AuthSessionGuard } from "./presentation/http/guards/auth-session.guard";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      {
        name: USER_PROFILE_MODEL_NAME,
        schema: UserProfileSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    AuthSessionGuard,
    CreateUserProfileUseCase,
    {
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
  ],
  exports: [CreateUserProfileUseCase],
})
export class UsersModule {}
