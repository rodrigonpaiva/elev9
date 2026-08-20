import { forwardRef, Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { FitnessModule } from '../fitness/fitness.module';
import { GoalsModule } from '../goals/goals.module';
import { HabitsModule } from '../habits/habits.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { ProgressModule } from '../progress/progress.module';
import { TrainingModule } from '../training/training.module';
import { UsersModule } from '../users/users.module';
import { AuthSessionGuard } from '../users/presentation/http/guards/auth-session.guard';
import { InternalEndpointGuard } from '../../common/guards/internal-endpoint.guard';
import { DashboardAdaptiveSignalsService } from './application/services/dashboard-adaptive-signals/dashboard-adaptive-signals.service';
import { GetHomeDashboardDebugUseCase } from './application/use-cases/get-home-dashboard-debug/get-home-dashboard-debug.use-case';
import { GetHomeDashboardUseCase } from './application/use-cases/get-home-dashboard/get-home-dashboard.use-case';
import { DashboardController } from './presentation/http/dashboard.controller';

@Module({
  imports: [
    AuthModule,
    AiModule,
    forwardRef(() => NotificationsModule),
    GoalsModule,
    HabitsModule,
    UsersModule,
    PersonalizationModule,
    FitnessModule,
    ProgressModule,
    TrainingModule,
  ],
  controllers: [DashboardController],
  providers: [
    AuthSessionGuard,
    InternalEndpointGuard,
    DashboardAdaptiveSignalsService,
    GetHomeDashboardUseCase,
    GetHomeDashboardDebugUseCase,
  ],
})
export class DashboardModule {}
