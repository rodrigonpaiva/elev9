import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AiModule } from '../ai/ai.module';
import { GoalsModule } from '../goals/goals.module';
import { HabitsModule } from '../habits/habits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecoveryModule } from '../recovery/recovery.module';
import { UsersModule } from '../users/users.module';
import { PersonalizationCalculatorService } from './application/services/personalization-calculator.service';
import { BuildBehavioralPatternsUseCase } from './application/use-cases/build-behavioral-patterns/build-behavioral-patterns.use-case';
import { BuildPersonalizationSnapshotUseCase } from './application/use-cases/build-personalization-snapshot/build-personalization-snapshot.use-case';
import { BuildUserBehaviorProfileUseCase } from './application/use-cases/build-user-behavior-profile/build-user-behavior-profile.use-case';
import { GetBehavioralPatternsUseCase } from './application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentPersonalizationUseCase } from './application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetPersonalizationHistoryUseCase } from './application/use-cases/get-personalization-history/get-personalization-history.use-case';
import { GetTodayPersonalizationUseCase } from './application/use-cases/get-today-personalization/get-today-personalization.use-case';
import { GetUserBehaviorProfileUseCase } from './application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { ReplayPersonalizationSnapshotUseCase } from './application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.use-case';
import { BEHAVIORAL_PATTERN_REPOSITORY } from './domain/repositories/behavioral-pattern.repository';
import { PERSONALIZATION_SNAPSHOT_REPOSITORY } from './domain/repositories/personalization-snapshot.repository';
import { USER_BEHAVIOR_PROFILE_REPOSITORY } from './domain/repositories/user-behavior-profile.repository';
import { MongooseBehavioralPatternRepository } from './infrastructure/mongoose/mongoose-behavioral-pattern.repository';
import { MongoosePersonalizationSnapshotRepository } from './infrastructure/mongoose/mongoose-personalization-snapshot.repository';
import { MongooseUserBehaviorProfileRepository } from './infrastructure/mongoose/mongoose-user-behavior-profile.repository';
import {
  BEHAVIORAL_PATTERN_MODEL_NAME,
  BehavioralPatternSchema,
} from './infrastructure/mongoose/behavioral-pattern.schema';
import {
  PERSONALIZATION_SNAPSHOT_MODEL_NAME,
  PersonalizationSnapshotSchema,
} from './infrastructure/mongoose/personalization-snapshot.schema';
import {
  USER_BEHAVIOR_PROFILE_MODEL_NAME,
  UserBehaviorProfileSchema,
} from './infrastructure/mongoose/user-behavior-profile.schema';
import { PersonalizationController } from './presentation/http/personalization.controller';

@Module({
  imports: [
    UsersModule,
    forwardRef(() => NotificationsModule),
    HabitsModule,
    GoalsModule,
    RecoveryModule,
    forwardRef(() => AiModule),
    MongooseModule.forFeature([
      {
        name: USER_BEHAVIOR_PROFILE_MODEL_NAME,
        schema: UserBehaviorProfileSchema,
      },
      {
        name: PERSONALIZATION_SNAPSHOT_MODEL_NAME,
        schema: PersonalizationSnapshotSchema,
      },
      {
        name: BEHAVIORAL_PATTERN_MODEL_NAME,
        schema: BehavioralPatternSchema,
      },
    ]),
  ],
  controllers: [PersonalizationController],
  providers: [
    PersonalizationCalculatorService,
    BuildPersonalizationSnapshotUseCase,
    BuildBehavioralPatternsUseCase,
    BuildUserBehaviorProfileUseCase,
    GetTodayPersonalizationUseCase,
    GetCurrentPersonalizationUseCase,
    GetPersonalizationHistoryUseCase,
    GetBehavioralPatternsUseCase,
    GetUserBehaviorProfileUseCase,
    ReplayPersonalizationSnapshotUseCase,
    {
      provide: USER_BEHAVIOR_PROFILE_REPOSITORY,
      useClass: MongooseUserBehaviorProfileRepository,
    },
    {
      provide: PERSONALIZATION_SNAPSHOT_REPOSITORY,
      useClass: MongoosePersonalizationSnapshotRepository,
    },
    {
      provide: BEHAVIORAL_PATTERN_REPOSITORY,
      useClass: MongooseBehavioralPatternRepository,
    },
  ],
  exports: [
    PersonalizationCalculatorService,
    BuildPersonalizationSnapshotUseCase,
    BuildBehavioralPatternsUseCase,
    BuildUserBehaviorProfileUseCase,
    GetTodayPersonalizationUseCase,
    GetCurrentPersonalizationUseCase,
    GetPersonalizationHistoryUseCase,
    GetBehavioralPatternsUseCase,
    GetUserBehaviorProfileUseCase,
    ReplayPersonalizationSnapshotUseCase,
    USER_BEHAVIOR_PROFILE_REPOSITORY,
    PERSONALIZATION_SNAPSHOT_REPOSITORY,
    BEHAVIORAL_PATTERN_REPOSITORY,
  ],
})
export class PersonalizationModule {}
