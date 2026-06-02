import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RECOVERY_SNAPSHOT_REPOSITORY } from './domain/repositories/recovery-snapshot.repository';
import { MongooseRecoverySnapshotRepository } from './infrastructure/mongoose/mongoose-recovery-snapshot.repository';
import {
  RECOVERY_SNAPSHOT_MODEL_NAME,
  RecoverySnapshotSchema,
} from './infrastructure/mongoose/recovery-snapshot.schema';
import { RecoveryScoreCalculatorService } from './application/services/recovery-score-calculator.service';
import { RecoveryDateService } from './application/services/recovery-date.service';
import { BuildRecoverySnapshotUseCase } from './application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import { GetCurrentRecoveryUseCase } from './application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetRecoveryHistoryUseCase } from './application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { GetTodayRecoveryUseCase } from './application/use-cases/get-today-recovery/get-today-recovery.use-case';
import { DAILY_CHECK_IN_REPOSITORY } from '../progress/domain/repositories/daily-check-in.repository';
import { MongooseDailyCheckInRepository } from '../progress/infrastructure/mongoose/mongoose-daily-check-in.repository';
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInSchema,
} from '../progress/infrastructure/mongoose/daily-check-in.schema';
import { FITNESS_PROFILE_REPOSITORY } from '../fitness/domain/repositories/fitness-profile.repository';
import { MongooseFitnessProfileRepository } from '../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository';
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from '../fitness/infrastructure/mongoose/fitness-profile.schema';
import { TRAINING_PLAN_REPOSITORY } from '../training/domain/repositories/training-plan.repository';
import { MongooseTrainingPlanRepository } from '../training/infrastructure/mongoose/mongoose-training-plan.repository';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from '../training/infrastructure/mongoose/training-plan.schema';
import { USER_PROFILE_REPOSITORY } from '../users/domain/repositories/user-profile.repository';
import { MongooseUserProfileRepository } from '../users/infrastructure/mongoose/mongoose-user-profile.repository';
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from '../users/infrastructure/mongoose/user-profile.schema';
import { WORKOUT_LOG_REPOSITORY } from '../progress/domain/repositories/workout-log.repository';
import { MongooseWorkoutLogRepository } from '../progress/infrastructure/mongoose/mongoose-workout-log.repository';
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogSchema,
} from '../progress/infrastructure/mongoose/workout-log.schema';
import { RecoveryController } from './presentation/http/recovery.controller';

@Module({
  imports: [
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
        name: DAILY_CHECK_IN_MODEL_NAME,
        schema: DailyCheckInSchema,
      },
      {
        name: WORKOUT_LOG_MODEL_NAME,
        schema: WorkoutLogSchema,
      },
      {
        name: RECOVERY_SNAPSHOT_MODEL_NAME,
        schema: RecoverySnapshotSchema,
      },
    ]),
  ],
  controllers: [RecoveryController],
  providers: [
    RecoveryScoreCalculatorService,
    RecoveryDateService,
    BuildRecoverySnapshotUseCase,
    GetTodayRecoveryUseCase,
    GetCurrentRecoveryUseCase,
    GetRecoveryHistoryUseCase,
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
      provide: DAILY_CHECK_IN_REPOSITORY,
      useClass: MongooseDailyCheckInRepository,
    },
    {
      provide: WORKOUT_LOG_REPOSITORY,
      useClass: MongooseWorkoutLogRepository,
    },
    {
      provide: RECOVERY_SNAPSHOT_REPOSITORY,
      useClass: MongooseRecoverySnapshotRepository,
    },
  ],
  exports: [
    RecoveryScoreCalculatorService,
    RECOVERY_SNAPSHOT_REPOSITORY,
    BuildRecoverySnapshotUseCase,
    GetTodayRecoveryUseCase,
    GetCurrentRecoveryUseCase,
    GetRecoveryHistoryUseCase,
  ],
})
export class RecoveryModule {}
