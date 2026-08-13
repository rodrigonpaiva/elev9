import * as dotenv from 'dotenv';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FitnessModule } from './modules/fitness/fitness.module';
import { HealthModule } from './modules/health/health.module';
import { GoalsModule } from './modules/goals/goals.module';
import { HabitsModule } from './modules/habits/habits.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { PersonalizationModule } from './modules/personalization/personalization.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TrainingModule } from './modules/training/training.module';
import { UsersModule } from './modules/users/users.module';
import { ObservabilityModule } from './observability/observability.module';

dotenv.config();

function getMongoDbUri(): string {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error('MONGODB_URI is required.');
  }

  return mongoDbUri;
}

@Module({
  imports: [
    ObservabilityModule,
    MongooseModule.forRoot(getMongoDbUri()),
    AiModule,
    AuthModule,
    DashboardModule,
    FitnessModule,
    HealthModule,
    GoalsModule,
    HabitsModule,
    NutritionModule,
    PersonalizationModule,
    NotificationsModule,
    RecoveryModule,
    ProgressModule,
    TrainingModule,
    UsersModule,
  ],
})
export class AppModule {}
