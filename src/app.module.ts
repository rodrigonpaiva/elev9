import * as dotenv from "dotenv";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "./modules/auth/auth.module";

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
  ],
})
export class AppModule {}
