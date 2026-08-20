import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { FitnessModule } from '../fitness/fitness.module';
import { GoalsModule } from '../goals/goals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProgressModule } from '../progress/progress.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { TrainingModule } from '../training/training.module';
import { UsersModule } from '../users/users.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { InternalEndpointGuard } from '../../common/guards/internal-endpoint.guard';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { HabitConsistencyCalculatorService } from './application/services/habit-consistency-calculator.service';
import { GetConsistencySummaryUseCase } from './application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetCurrentHabitsUseCase } from './application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from './application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetHabitRiskSignalsUseCase } from './application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetTodayHabitsUseCase } from './application/use-cases/get-today-habits/get-today-habits.use-case';
import { BuildConsistencySummaryUseCase } from './application/use-cases/build-consistency-summary/build-consistency-summary.use-case';
import { BuildHabitRiskSignalsUseCase } from './application/use-cases/build-habit-risk-signals/build-habit-risk-signals.use-case';
import { BuildHabitSnapshotUseCase } from './application/use-cases/build-habit-snapshot/build-habit-snapshot.use-case';
import { ReplayHabitSnapshotUseCase } from './application/use-cases/replay-habit-snapshot/replay-habit-snapshot.use-case';
import { CONSISTENCY_SUMMARY_REPOSITORY } from './domain/repositories/consistency-summary.repository';
import { HABIT_RISK_SIGNAL_REPOSITORY } from './domain/repositories/habit-risk-signal.repository';
import { HABIT_SNAPSHOT_REPOSITORY } from './domain/repositories/habit-snapshot.repository';
import { MongooseConsistencySummaryRepository } from './infrastructure/mongoose/mongoose-consistency-summary.repository';
import { MongooseHabitRiskSignalRepository } from './infrastructure/mongoose/mongoose-habit-risk-signal.repository';
import { MongooseHabitSnapshotRepository } from './infrastructure/mongoose/mongoose-habit-snapshot.repository';
import {
  CONSISTENCY_SUMMARY_MODEL_NAME,
  ConsistencySummarySchema,
} from './infrastructure/mongoose/consistency-summary.schema';
import {
  HABIT_RISK_SIGNAL_MODEL_NAME,
  HabitRiskSignalSchema,
} from './infrastructure/mongoose/habit-risk-signal.schema';
import {
  HABIT_SNAPSHOT_MODEL_NAME,
  HabitSnapshotSchema,
} from './infrastructure/mongoose/habit-snapshot.schema';
import { HabitsController } from './presentation/http/habits.controller';

@Module({
  controllers: [HabitsController],
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    ProgressModule,
    RecoveryModule,
    GoalsModule,
    NotificationsModule,
    TrainingModule,
    MongooseModule.forFeature([
      { name: HABIT_SNAPSHOT_MODEL_NAME, schema: HabitSnapshotSchema },
      {
        name: CONSISTENCY_SUMMARY_MODEL_NAME,
        schema: ConsistencySummarySchema,
      },
      { name: HABIT_RISK_SIGNAL_MODEL_NAME, schema: HabitRiskSignalSchema },
    ]),
  ],
  providers: [
    AuthSessionGuard,
    InternalEndpointGuard,
    PlatformDateService,
    HabitConsistencyCalculatorService,
    BuildHabitSnapshotUseCase,
    BuildConsistencySummaryUseCase,
    BuildHabitRiskSignalsUseCase,
    GetTodayHabitsUseCase,
    GetCurrentHabitsUseCase,
    GetHabitHistoryUseCase,
    GetConsistencySummaryUseCase,
    GetHabitRiskSignalsUseCase,
    ReplayHabitSnapshotUseCase,
    {
      provide: HABIT_SNAPSHOT_REPOSITORY,
      useClass: MongooseHabitSnapshotRepository,
    },
    {
      provide: CONSISTENCY_SUMMARY_REPOSITORY,
      useClass: MongooseConsistencySummaryRepository,
    },
    {
      provide: HABIT_RISK_SIGNAL_REPOSITORY,
      useClass: MongooseHabitRiskSignalRepository,
    },
  ],
  exports: [
    HabitConsistencyCalculatorService,
    BuildHabitSnapshotUseCase,
    BuildConsistencySummaryUseCase,
    BuildHabitRiskSignalsUseCase,
    GetTodayHabitsUseCase,
    GetCurrentHabitsUseCase,
    GetHabitHistoryUseCase,
    GetConsistencySummaryUseCase,
    GetHabitRiskSignalsUseCase,
    ReplayHabitSnapshotUseCase,
    HABIT_SNAPSHOT_REPOSITORY,
    CONSISTENCY_SUMMARY_REPOSITORY,
    HABIT_RISK_SIGNAL_REPOSITORY,
  ],
})
export class HabitsModule {}
