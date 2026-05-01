import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { disconnect } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import { AuthModule } from "../../src/modules/auth/auth.module";
import { FitnessModule } from "../../src/modules/fitness/fitness.module";
import { UsersModule } from "../../src/modules/users/users.module";

describe("Fitness Create Profile E2E", () => {
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
        email: "fitness-success@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "fitness-success@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/users/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
      .send({
        name: "Rodrigo Paiva",
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/fitness/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
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

    expect(response.body).toEqual({
      fitnessProfile: {
        id: expect.any(String),
        userProfileId: expect.any(String),
        heightCm: 180,
        weightKg: 82.5,
        goal: "gain_muscle",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: expect.any(String),
      },
    });
  });

  it("creating twice returns 409", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "fitness-duplicate@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "fitness-duplicate@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post("/users/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Rodrigo Paiva",
      })
      .expect(201);

    await request(app.getHttpServer())
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

    const response = await request(app.getHttpServer())
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
      .expect(409);

    expect(response.body).toEqual({
      code: "FITNESS_PROFILE_ALREADY_EXISTS",
      message: "Fitness profile already exists.",
    });
  });

  it("without token returns 401", async () => {
    const response = await request(app.getHttpServer())
      .post("/fitness/profile")
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
      .expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_SESSION",
      message: "Invalid session.",
    });
  });

  it("without user profile returns USER_PROFILE_NOT_FOUND", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "fitness-no-profile@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "fitness-no-profile@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post("/fitness/profile")
      .set("Authorization", `Bearer ${loginResponse.body.accessToken}`)
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
      .expect(404);

    expect(response.body).toEqual({
      code: "USER_PROFILE_NOT_FOUND",
      message: "User profile not found.",
    });
  });
});
