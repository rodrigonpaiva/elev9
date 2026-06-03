import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

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
import {
  USER_PROFILE_REPOSITORY,
} from '../users/domain/repositories/user-profile.repository';
import {
  MongooseUserProfileRepository,
} from '../users/infrastructure/mongoose/mongoose-user-profile.repository';
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileSchema,
} from '../users/infrastructure/mongoose/user-profile.schema';
import {
  FITNESS_PROFILE_REPOSITORY,
} from '../fitness/domain/repositories/fitness-profile.repository';
import {
  MongooseFitnessProfileRepository,
} from '../fitness/infrastructure/mongoose/mongoose-fitness-profile.repository';
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileSchema,
} from '../fitness/infrastructure/mongoose/fitness-profile.schema';
import {
  WORKOUT_LOG_REPOSITORY,
} from '../progress/domain/repositories/workout-log.repository';
import {
  MongooseWorkoutLogRepository,
} from '../progress/infrastructure/mongoose/mongoose-workout-log.repository';
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogSchema,
} from '../progress/infrastructure/mongoose/workout-log.schema';
import {
  DAILY_CHECK_IN_REPOSITORY,
} from '../progress/domain/repositories/daily-check-in.repository';
import {
  MongooseDailyCheckInRepository,
} from '../progress/infrastructure/mongoose/mongoose-daily-check-in.repository';
import {
  DAILY_CHECK_IN_MODEL_NAME,
  DailyCheckInSchema,
} from '../progress/infrastructure/mongoose/daily-check-in.schema';
import {
  NUTRITION_PLAN_REPOSITORY,
} from '../nutrition/domain/repositories/nutrition-plan.repository';
import {
  MongooseNutritionPlanRepository,
} from '../nutrition/infrastructure/mongoose/mongoose-nutrition-plan.repository';
import {
  NUTRITION_PLAN_MODEL_NAME,
  NutritionPlanSchema,
} from '../nutrition/infrastructure/mongoose/nutrition-plan.schema';
import {
  NUTRITION_LOG_REPOSITORY,
} from '../nutrition/domain/repositories/nutrition-log.repository';
import {
  MongooseNutritionLogRepository,
} from '../nutrition/infrastructure/mongoose/mongoose-nutrition-log.repository';
import {
  NUTRITION_LOG_MODEL_NAME,
  NutritionLogSchema,
} from '../nutrition/infrastructure/mongoose/nutrition-log.schema';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
} from '../recovery/domain/repositories/recovery-snapshot.repository';
import {
  MongooseRecoverySnapshotRepository,
} from '../recovery/infrastructure/mongoose/mongoose-recovery-snapshot.repository';
import {
  RECOVERY_SNAPSHOT_MODEL_NAME,
  RecoverySnapshotSchema,
} from '../recovery/infrastructure/mongoose/recovery-snapshot.schema';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
} from '../training/domain/repositories/adaptive-training-recommendation.repository';
import {
  MongooseAdaptiveTrainingRecommendationRepository,
} from '../training/infrastructure/mongoose/mongoose-adaptive-training-recommendation.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME,
  AdaptiveTrainingRecommendationSchema,
} from '../training/infrastructure/mongoose/adaptive-training-recommendation.schema';
import {
  TRAINING_PLAN_REPOSITORY,
} from '../training/domain/repositories/training-plan.repository';
import {
  MongooseTrainingPlanRepository,
} from '../training/infrastructure/mongoose/mongoose-training-plan.repository';
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanSchema,
} from '../training/infrastructure/mongoose/training-plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_PROFILE_MODEL_NAME, schema: UserProfileSchema },
      { name: FITNESS_PROFILE_MODEL_NAME, schema: FitnessProfileSchema },
      { name: WORKOUT_LOG_MODEL_NAME, schema: WorkoutLogSchema },
      { name: DAILY_CHECK_IN_MODEL_NAME, schema: DailyCheckInSchema },
      { name: NUTRITION_PLAN_MODEL_NAME, schema: NutritionPlanSchema },
      { name: NUTRITION_LOG_MODEL_NAME, schema: NutritionLogSchema },
      { name: RECOVERY_SNAPSHOT_MODEL_NAME, schema: RecoverySnapshotSchema },
      {
        name: ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME,
        schema: AdaptiveTrainingRecommendationSchema,
      },
      { name: TRAINING_PLAN_MODEL_NAME, schema: TrainingPlanSchema },
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
      provide: USER_PROFILE_REPOSITORY,
      useClass: MongooseUserProfileRepository,
    },
    {
      provide: FITNESS_PROFILE_REPOSITORY,
      useClass: MongooseFitnessProfileRepository,
    },
    {
      provide: WORKOUT_LOG_REPOSITORY,
      useClass: MongooseWorkoutLogRepository,
    },
    {
      provide: DAILY_CHECK_IN_REPOSITORY,
      useClass: MongooseDailyCheckInRepository,
    },
    {
      provide: NUTRITION_PLAN_REPOSITORY,
      useClass: MongooseNutritionPlanRepository,
    },
    {
      provide: NUTRITION_LOG_REPOSITORY,
      useClass: MongooseNutritionLogRepository,
    },
    {
      provide: RECOVERY_SNAPSHOT_REPOSITORY,
      useClass: MongooseRecoverySnapshotRepository,
    },
    {
      provide: ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
      useClass: MongooseAdaptiveTrainingRecommendationRepository,
    },
    {
      provide: TRAINING_PLAN_REPOSITORY,
      useClass: MongooseTrainingPlanRepository,
    },
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
    USER_PROFILE_REPOSITORY,
    FITNESS_PROFILE_REPOSITORY,
    WORKOUT_LOG_REPOSITORY,
    DAILY_CHECK_IN_REPOSITORY,
    NUTRITION_PLAN_REPOSITORY,
    NUTRITION_LOG_REPOSITORY,
    RECOVERY_SNAPSHOT_REPOSITORY,
    ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
    TRAINING_PLAN_REPOSITORY,
    GOAL_REPOSITORY,
    GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
    GOAL_FORECAST_REPOSITORY,
    GOAL_MILESTONE_REPOSITORY,
    GOAL_ACHIEVEMENT_REPOSITORY,
  ],
  controllers: [GoalsController],
})
export class GoalsModule {}
