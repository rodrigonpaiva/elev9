import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { RecoveryScoreCalculatorService } from './application/services/recovery-score-calculator.service';
import { RecoveryDateService } from './application/services/recovery-date.service';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { BuildRecoverySnapshotUseCase } from './application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import { GetCurrentRecoveryUseCase } from './application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetRecoveryHistoryUseCase } from './application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { GetTodayRecoveryUseCase } from './application/use-cases/get-today-recovery/get-today-recovery.use-case';
import { ProgressModule } from '../progress/progress.module';
import { FitnessModule } from '../fitness/fitness.module';
import { UsersModule } from '../users/users.module';
import { TRAINING_PLAN_REPOSITORY } from '../training/domain/repositories/training-plan.repository';
import { MongooseTrainingPlanRepository } from '../training/infrastructure/mongoose/mongoose-training-plan.repository';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from '../training/infrastructure/mongoose/training-plan.schema';
import { RECOVERY_SNAPSHOT_REPOSITORY } from './domain/repositories/recovery-snapshot.repository';
import { MongooseRecoverySnapshotRepository } from './infrastructure/mongoose/mongoose-recovery-snapshot.repository';
import {
  RECOVERY_SNAPSHOT_MODEL_NAME,
  RecoverySnapshotSchema,
} from './infrastructure/mongoose/recovery-snapshot.schema';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { RecoveryController } from './presentation/http/recovery.controller';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    ProgressModule,
    MongooseModule.forFeature([
      {
        name: TRAINING_PLAN_MODEL_NAME,
        schema: TrainingPlanSchema,
      },
      {
        name: RECOVERY_SNAPSHOT_MODEL_NAME,
        schema: RecoverySnapshotSchema,
      },
    ]),
  ],
  controllers: [RecoveryController],
  providers: [
    AuthSessionGuard,
    PlatformDateService,
    RecoveryScoreCalculatorService,
    RecoveryDateService,
    BuildRecoverySnapshotUseCase,
    GetTodayRecoveryUseCase,
    GetCurrentRecoveryUseCase,
    GetRecoveryHistoryUseCase,
    {
      provide: TRAINING_PLAN_REPOSITORY,
      useClass: MongooseTrainingPlanRepository,
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
