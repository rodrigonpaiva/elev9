import * as dotenv from "dotenv";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "./modules/auth/auth.module";
import { FitnessModule } from "./modules/fitness/fitness.module";
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
    AuthModule,
    FitnessModule,
    TrainingModule,
    UsersModule,
  ],
})
export class AppModule {}
