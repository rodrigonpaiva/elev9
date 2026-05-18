import * as dotenv from "dotenv";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AiModule } from "./modules/ai/ai.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { FitnessModule } from "./modules/fitness/fitness.module";
import { NutritionModule } from "./modules/nutrition/nutrition.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { TrainingModule } from "./modules/training/training.module";
import { UsersModule } from "./modules/users/users.module";

dotenv.config();

function getMongoDbUri(): string {
  const mongoDbUri = process.env.MONGODB_URI;

  if (!mongoDbUri) {
    throw new Error("MONGODB_URI is required.");
  }

  return mongoDbUri;
}

@Module({
  imports: [
    MongooseModule.forRoot(getMongoDbUri()),
    AiModule,
    AuthModule,
    DashboardModule,
    FitnessModule,
    NutritionModule,
    ProgressModule,
    TrainingModule,
    UsersModule,
  ],
})
export class AppModule {}
