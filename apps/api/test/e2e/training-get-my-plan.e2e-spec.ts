import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { disconnect } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import { AuthModule } from "../../src/modules/auth/auth.module";
import { FitnessModule } from "../../src/modules/fitness/fitness.module";
import { TrainingModule } from "../../src/modules/training/training.module";
import { UsersModule } from "../../src/modules/users/users.module";

describe("Training Get My Plan E2E", () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  });

  it("full flow success", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "training-current-success@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "training-current-success@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post("/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rodrigo Paiva" })
      .expect(201);

    const fitnessResponse = await request(app.getHttpServer())
      .post("/fitness/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: "gain_muscle",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/training/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get("/training/plans/current")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.trainingPlan).toEqual({
      id: expect.any(String),
      fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      status: "active",
      goal: "gain_muscle",
      activityLevel: "medium",
      weeklySchedule: expect.any(Array),
      createdAt: expect.any(String),
    });
  });

  it("without token returns 401", async () => {
    const response = await request(app.getHttpServer())
      .get("/training/plans/current")
      .expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_SESSION",
      message: "Invalid session.",
    });
  });

  it("without fitness profile returns 404", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "No Fitness User",
        email: "training-current-no-fitness@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "training-current-no-fitness@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/users/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .send({ name: "No Fitness User" })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get("/training/plans/current")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .expect(404);

    expect(response.body).toEqual({
      code: "FITNESS_PROFILE_NOT_FOUND",
      message: "Fitness profile not found.",
    });
  });

  it("without training plan returns 404", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "No Training User",
        email: "training-current-no-plan@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "training-current-no-plan@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/users/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .send({ name: "No Training User" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/fitness/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: "maintain",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 3,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get("/training/plans/current")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .expect(404);

    expect(response.body).toEqual({
      code: "TRAINING_PLAN_NOT_FOUND",
      message: "Training plan not found.",
    });
  });
});
