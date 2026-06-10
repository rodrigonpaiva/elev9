import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { FitnessModule } from '../fitness/fitness.module';
import { GoalsModule } from '../goals/goals.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { ProgressModule } from '../progress/progress.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { TrainingModule } from '../training/training.module';
import { UsersModule } from '../users/users.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { PlatformDateService } from '../../shared/date/platform-date.service';
import { NotificationDecisionCalculatorService } from './application/services/notification-decision-calculator.service';
import { BuildNotificationDecisionUseCase } from './application/use-cases/build-notification-decision/build-notification-decision.use-case';
import { GetCurrentNotificationUseCase } from './application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from './application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetNotificationHistoryUseCase } from './application/use-cases/get-notification-history/get-notification-history.use-case';
import { GetTodayNotificationUseCase } from './application/use-cases/get-today-notification/get-today-notification.use-case';
import { ReplayNotificationDecisionUseCase } from './application/use-cases/replay-notification-decision/replay-notification-decision.use-case';
import { RecordEngagementEventUseCase } from './application/use-cases/record-engagement-event/record-engagement-event.use-case';
import { NotificationsController } from './presentation/http/notifications.controller';
import {
  ENGAGEMENT_EVENT_MODEL_NAME,
  EngagementEventSchema,
} from './infrastructure/mongoose/engagement-event.schema';
import {
  NOTIFICATION_DECISION_MODEL_NAME,
  NotificationDecisionSchema,
} from './infrastructure/mongoose/notification-decision.schema';
import {
  NOTIFICATION_HISTORY_MODEL_NAME,
  NotificationHistorySchema,
} from './infrastructure/mongoose/notification-history.schema';
import { MongooseNotificationDecisionRepository } from './infrastructure/mongoose/mongoose-notification-decision.repository';
import { MongooseNotificationHistoryRepository } from './infrastructure/mongoose/mongoose-notification-history.repository';
import { MongooseEngagementEventRepository } from './infrastructure/mongoose/mongoose-engagement-event.repository';
import { NOTIFICATION_DECISION_REPOSITORY } from './domain/repositories/notification-decision.repository';
import { NOTIFICATION_HISTORY_REPOSITORY } from './domain/repositories/notification-history.repository';
import { ENGAGEMENT_EVENT_REPOSITORY } from './domain/repositories/engagement-event.repository';
import { NotificationFatiguePolicyService } from './application/services/notification-fatigue-policy.service';

@Module({
  controllers: [NotificationsController],
  imports: [
    AuthModule,
    UsersModule,
    FitnessModule,
    ProgressModule,
    NutritionModule,
    GoalsModule,
    RecoveryModule,
    TrainingModule,
    forwardRef(() => AiModule),
    forwardRef(() => PersonalizationModule),
    MongooseModule.forFeature([
      {
        name: NOTIFICATION_DECISION_MODEL_NAME,
        schema: NotificationDecisionSchema,
      },
      {
        name: NOTIFICATION_HISTORY_MODEL_NAME,
        schema: NotificationHistorySchema,
      },
      {
        name: ENGAGEMENT_EVENT_MODEL_NAME,
        schema: EngagementEventSchema,
      },
    ]),
  ],
  providers: [
    AuthSessionGuard,
    PlatformDateService,
    NotificationDecisionCalculatorService,
    NotificationFatiguePolicyService,
    BuildNotificationDecisionUseCase,
    GetTodayNotificationUseCase,
    GetCurrentNotificationUseCase,
    GetNotificationHistoryUseCase,
    GetEngagementSummaryUseCase,
    ReplayNotificationDecisionUseCase,
    RecordEngagementEventUseCase,
    {
      provide: NOTIFICATION_DECISION_REPOSITORY,
      useClass: MongooseNotificationDecisionRepository,
    },
    {
      provide: NOTIFICATION_HISTORY_REPOSITORY,
      useClass: MongooseNotificationHistoryRepository,
    },
    {
      provide: ENGAGEMENT_EVENT_REPOSITORY,
      useClass: MongooseEngagementEventRepository,
    },
  ],
  exports: [
    BuildNotificationDecisionUseCase,
    NotificationDecisionCalculatorService,
    GetCurrentNotificationUseCase,
    GetEngagementSummaryUseCase,
    ReplayNotificationDecisionUseCase,
    NOTIFICATION_DECISION_REPOSITORY,
    NOTIFICATION_HISTORY_REPOSITORY,
    ENGAGEMENT_EVENT_REPOSITORY,
  ],
})
export class NotificationsModule {}
