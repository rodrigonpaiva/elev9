import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { disconnect } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import { AiModule } from "../../src/modules/ai/ai.module";
import { AuthModule } from "../../src/modules/auth/auth.module";
import { FitnessModule } from "../../src/modules/fitness/fitness.module";
import { Clock, CLOCK } from "../../src/modules/progress/domain/services/clock.service";
import { ProgressModule } from "../../src/modules/progress/progress.module";
import { TrainingModule } from "../../src/modules/training/training.module";
import { UsersModule } from "../../src/modules/users/users.module";

describe("AI Coach Feedback E2E", () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let currentNow: Date;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();
    currentNow = new Date("2026-05-04T10:00:00.000Z");

    const testClock: Clock = {
      now: () => currentNow,
      todayUtcDateString: () => currentNow.toISOString().slice(0, 10),
    };

    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
        AiModule,
      ],
    });

    moduleBuilder.overrideProvider(CLOCK).useValue(testClock);

    const moduleRef: TestingModule = await moduleBuilder.compile();

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

  it("returns coach feedback for an authenticated user", async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      "ai-coach-success@email.com",
    );

    const response = await request(app.getHttpServer())
      .post("/ai/coach-feedback")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(response.body).toEqual({
      message: expect.any(String),
      insights: expect.any(Array),
      recommendations: expect.any(Array),
    });
  });

  it("rejects extra body fields with AI_COACH_INVALID_INPUT", async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      "ai-coach-invalid-input@email.com",
    );

    const response = await request(app.getHttpServer())
      .post("/ai/coach-feedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ authUserId: "forbidden" })
      .expect(400);

    expect(response.body).toEqual({
      code: "AI_COACH_INVALID_INPUT",
      message: "Invalid input.",
    });
  });

  async function createAuthenticatedTrainingFlow(email: string): Promise<{
    token: string;
  }> {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email,
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email,
        password: "StrongPassword123",
      })
      .expect(200);

    const token = loginResponse.body.accessToken as string;

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
          daysPerWeek: 3,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    const trainingResponse = await request(app.getHttpServer())
      .post("/training/plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/progress/workout-logs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        trainingPlanId: trainingResponse.body.trainingPlan.id,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: "push_up", setsDone: 4, repsDone: 12 }],
      })
      .expect(201);

    return { token };
  }
});
