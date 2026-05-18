import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { BuildUserHealthContextService } from "../ai/application/services/context-builder/build-user-health-context.service";
import { AuthModule } from "../auth/auth.module";
import { FITNESS_PROFILE_REPOSITORY } from "../fitness/domain/repositories/fitness-profile.repository";
import { MongooseFitnessProfileRepository } from "../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository";
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from "../fitness/infrastructure/mongoose/fitness-profile.schema";
import { DAILY_CHECK_IN_REPOSITORY } from "../progress/domain/repositories/daily-check-in.repository";
import { WORKOUT_LOG_REPOSITORY } from "../progress/domain/repositories/workout-log.repository";
import { CLOCK } from "../progress/domain/services/clock.service";
import { MongooseDailyCheckInRepository } from "../progress/infrastructure/mongoose/mongoose-daily-check-in.repository";
import { MongooseWorkoutLogRepository } from "../progress/infrastructure/mongoose/mongoose-workout-log.repository";
import { SystemClockService } from "../progress/infrastructure/system-clock.service";
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInSchema,
} from "../progress/infrastructure/mongoose/daily-check-in.schema";
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogSchema,
} from "../progress/infrastructure/mongoose/workout-log.schema";
import { TRAINING_PLAN_REPOSITORY } from "../training/domain/repositories/training-plan.repository";
import { MongooseTrainingPlanRepository } from "../training/infrastructure/mongoose/mongoose-training-plan.repository";
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from "../training/infrastructure/mongoose/training-plan.schema";
import { USER_PROFILE_REPOSITORY } from "../users/domain/repositories/user-profile.repository";
import { MongooseUserProfileRepository } from "../users/infrastructure/mongoose/mongoose-user-profile.repository";
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from "../users/infrastructure/mongoose/user-profile.schema";
import { AuthSessionGuard } from "../users/presentation/http/guards/auth-session.guard";
import { DashboardAdaptiveSignalsService } from "./application/services/dashboard-adaptive-signals/dashboard-adaptive-signals.service";
import { GetHomeDashboardDebugUseCase } from "./application/use-cases/get-home-dashboard-debug/get-home-dashboard-debug.use-case";
import { GetHomeDashboardUseCase } from "./application/use-cases/get-home-dashboard/get-home-dashboard.use-case";
import { DashboardController } from "./presentation/http/dashboard.controller";

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
      {
        name: WORKOUT_LOG_MODEL_NAME,
        schema: WorkoutLogSchema,
      },
      {
        name: DAILY_CHECK_IN_MODEL_NAME,
        schema: DailyCheckInSchema,
      },
    ]),
  ],
  controllers: [DashboardController],
  providers: [
    AuthSessionGuard,
    BuildUserHealthContextService,
    DashboardAdaptiveSignalsService,
    GetHomeDashboardUseCase,
    GetHomeDashboardDebugUseCase,
    {
      provide: CLOCK,
      useClass: SystemClockService,
    },
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
      provide: WORKOUT_LOG_REPOSITORY,
      useClass: MongooseWorkoutLogRepository,
    },
    {
      provide: DAILY_CHECK_IN_REPOSITORY,
      useClass: MongooseDailyCheckInRepository,
    },
  ],
})
export class DashboardModule {}
