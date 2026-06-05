import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FitnessModule } from '../fitness/fitness.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { ProgressModule } from '../progress/progress.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { TrainingModule } from '../training/training.module';
import { UsersModule } from '../users/users.module';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { GoalDateService } from './application/services/goal-date.service';
import { GoalProgressCalculatorService } from './application/services/goal-progress-calculator.service';
import { BuildGoalForecastUseCase } from './application/use-cases/build-goal-forecast/build-goal-forecast.use-case';
import { BuildGoalProgressSnapshotUseCase } from './application/use-cases/build-goal-progress-snapshot/build-goal-progress-snapshot.use-case';
import { GetCurrentGoalUseCase } from './application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalAchievementHistoryUseCase } from './application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetGoalForecastUseCase } from './application/use-cases/get-goal-forecast/get-goal-forecast.use-case';
import { GetGoalHistoryUseCase } from './application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from './application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GoalsController } from './presentation/http/goals.controller';
import { GOAL_ACHIEVEMENT_REPOSITORY } from './domain/repositories/goal-achievement.repository';
import { GOAL_FORECAST_REPOSITORY } from './domain/repositories/goal-forecast.repository';
import { GOAL_MILESTONE_REPOSITORY } from './domain/repositories/goal-milestone.repository';
import { GOAL_PROGRESS_SNAPSHOT_REPOSITORY } from './domain/repositories/goal-progress-snapshot.repository';
import { GOAL_REPOSITORY } from './domain/repositories/goal.repository';
import { MongooseGoalAchievementRepository } from './infrastructure/mongoose/mongoose-goal-achievement.repository';
import { MongooseGoalForecastRepository } from './infrastructure/mongoose/mongoose-goal-forecast.repository';
import { MongooseGoalMilestoneRepository } from './infrastructure/mongoose/mongoose-goal-milestone.repository';
import { MongooseGoalProgressSnapshotRepository } from './infrastructure/mongoose/mongoose-goal-progress-snapshot.repository';
import { MongooseGoalRepository } from './infrastructure/mongoose/mongoose-goal.repository';
import {
  GOAL_ACHIEVEMENT_MODEL_NAME,
  GoalAchievementSchema,
} from './infrastructure/mongoose/goal-achievement.schema';
import {
  GOAL_FORECAST_MODEL_NAME,
  GoalForecastSchema,
} from './infrastructure/mongoose/goal-forecast.schema';
import {
  GOAL_MILESTONE_MODEL_NAME,
  GoalMilestoneSchema,
} from './infrastructure/mongoose/goal-milestone.schema';
import {
  GOAL_PROGRESS_SNAPSHOT_MODEL_NAME,
  GoalProgressSnapshotSchema,
} from './infrastructure/mongoose/goal-progress-snapshot.schema';
import { GOAL_MODEL_NAME, GoalSchema } from './infrastructure/mongoose/goal.schema';

@Module({
  imports: [
    UsersModule,
    FitnessModule,
    ProgressModule,
    NutritionModule,
    RecoveryModule,
    TrainingModule,
    MongooseModule.forFeature([
      { name: GOAL_MODEL_NAME, schema: GoalSchema },
      {
        name: GOAL_PROGRESS_SNAPSHOT_MODEL_NAME,
        schema: GoalProgressSnapshotSchema,
      },
      { name: GOAL_FORECAST_MODEL_NAME, schema: GoalForecastSchema },
      { name: GOAL_MILESTONE_MODEL_NAME, schema: GoalMilestoneSchema },
      { name: GOAL_ACHIEVEMENT_MODEL_NAME, schema: GoalAchievementSchema },
    ]),
  ],
  providers: [
    PlatformDateService,
    GoalDateService,
    GoalProgressCalculatorService,
    BuildGoalProgressSnapshotUseCase,
    BuildGoalForecastUseCase,
    GetCurrentGoalUseCase,
    GetGoalHistoryUseCase,
    GetGoalMilestonesUseCase,
    GetGoalAchievementHistoryUseCase,
    GetGoalForecastUseCase,
    {
      provide: GOAL_REPOSITORY,
      useClass: MongooseGoalRepository,
    },
    {
      provide: GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
      useClass: MongooseGoalProgressSnapshotRepository,
    },
    {
      provide: GOAL_FORECAST_REPOSITORY,
      useClass: MongooseGoalForecastRepository,
    },
    {
      provide: GOAL_MILESTONE_REPOSITORY,
      useClass: MongooseGoalMilestoneRepository,
    },
    {
      provide: GOAL_ACHIEVEMENT_REPOSITORY,
      useClass: MongooseGoalAchievementRepository,
    },
  ],
  exports: [
    GoalDateService,
    GoalProgressCalculatorService,
    BuildGoalProgressSnapshotUseCase,
    BuildGoalForecastUseCase,
    GetCurrentGoalUseCase,
    GetGoalMilestonesUseCase,
    GOAL_REPOSITORY,
    GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
    GOAL_FORECAST_REPOSITORY,
    GOAL_MILESTONE_REPOSITORY,
    GOAL_ACHIEVEMENT_REPOSITORY,
  ],
  controllers: [GoalsController],
})
export class GoalsModule {}
