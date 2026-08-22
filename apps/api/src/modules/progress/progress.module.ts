import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { FitnessModule } from '../fitness/fitness.module';
import { TRAINING_PLAN_REPOSITORY } from '../training/domain/repositories/training-plan.repository';
import { MongooseTrainingPlanRepository } from '../training/infrastructure/mongoose/mongoose-training-plan.repository';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from '../training/infrastructure/mongoose/training-plan.schema';
import { UsersModule } from '../users/users.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { CreateDailyCheckInUseCase } from './application/use-cases/create-daily-check-in/create-daily-check-in.use-case';
import { DailyCheckInDateService } from './application/services/daily-check-in-date.service';
import { GetDailyCheckInHistoryUseCase } from './application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import { GetTodayDailyCheckInUseCase } from './application/use-cases/get-today-daily-check-in/get-today-daily-check-in.use-case';
import { GetWorkoutHistoryUseCase } from './application/use-cases/get-workout-history/get-workout-history.use-case';
import { GetProgressSummaryUseCase } from './application/use-cases/get-progress-summary/get-progress-summary.use-case';
import { LogWorkoutUseCase } from './application/use-cases/log-workout/log-workout.use-case';
import { StartWorkoutUseCase } from './application/use-cases/start-workout/start-workout.use-case';
import { CompleteWorkoutUseCase } from './application/use-cases/complete-workout/complete-workout.use-case';
import { ReplaceWorkoutExerciseUseCase } from './application/use-cases/replace-workout-exercise/replace-workout-exercise.use-case';
import { DAILY_CHECK_IN_REPOSITORY } from './domain/repositories/daily-check-in.repository';
import { WORKOUT_LOG_REPOSITORY } from './domain/repositories/workout-log.repository';
import { WORKOUT_SESSION_REPOSITORY } from './domain/repositories/workout-session.repository';
import { CLOCK } from './domain/services/clock.service';
import { MongooseDailyCheckInRepository } from './infrastructure/mongoose/mongoose-daily-check-in.repository';
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInSchema,
} from './infrastructure/mongoose/daily-check-in.schema';
import { MongooseWorkoutLogRepository } from './infrastructure/mongoose/mongoose-workout-log.repository';
import { MongooseWorkoutSessionRepository } from './infrastructure/mongoose/mongoose-workout-session.repository';
import { SystemClockService } from './infrastructure/system-clock.service';
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogSchema,
} from './infrastructure/mongoose/workout-log.schema';
import {
  WORKOUT_SESSION_MODEL_NAME,
  WorkoutSessionSchema,
} from './infrastructure/mongoose/workout-session.schema';
import { ProgressController } from './presentation/http/progress.controller';

@Module({
  imports: [
    AuthModule,
    forwardRef(() => RecoveryModule),
    UsersModule,
    FitnessModule,
    MongooseModule.forFeature([
      {
        name: TRAINING_PLAN_MODEL_NAME,
        schema: TrainingPlanSchema,
      },
      {
        name: WORKOUT_LOG_MODEL_NAME,
        schema: WorkoutLogSchema,
      },
      {
        name: WORKOUT_SESSION_MODEL_NAME,
        schema: WorkoutSessionSchema,
      },
      {
        name: DAILY_CHECK_IN_MODEL_NAME,
        schema: DailyCheckInSchema,
      },
    ]),
  ],
  controllers: [ProgressController],
  providers: [
    AuthSessionGuard,
    CreateDailyCheckInUseCase,
    DailyCheckInDateService,
    GetDailyCheckInHistoryUseCase,
    GetTodayDailyCheckInUseCase,
    GetWorkoutHistoryUseCase,
    GetProgressSummaryUseCase,
    LogWorkoutUseCase,
    StartWorkoutUseCase,
    CompleteWorkoutUseCase,
    ReplaceWorkoutExerciseUseCase,
    {
      provide: CLOCK,
      useClass: SystemClockService,
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
      provide: WORKOUT_SESSION_REPOSITORY,
      useClass: MongooseWorkoutSessionRepository,
    },
    {
      provide: DAILY_CHECK_IN_REPOSITORY,
      useClass: MongooseDailyCheckInRepository,
    },
  ],
  exports: [
    CLOCK,
    WORKOUT_LOG_REPOSITORY,
    DAILY_CHECK_IN_REPOSITORY,
    GetDailyCheckInHistoryUseCase,
    GetTodayDailyCheckInUseCase,
    GetWorkoutHistoryUseCase,
    GetProgressSummaryUseCase,
  ],
})
export class ProgressModule {}
