import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { disconnect } from "mongoose";
import request from "supertest";

import { AuthModule } from "../../src/modules/auth/auth.module";

describe("Auth Me E2E", () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), AuthModule],
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
    await app.close();
    await disconnect();
    await mongoMemoryServer.stop();
  });

  it("login -> use token -> GET /auth/me success", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "auth-me@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "auth-me@email.com",
        password: "StrongPassword123",
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: "auth-me@email.com",
      },
    });
  });

  it("GET /auth/me without token returns 401", async () => {
    const response = await request(app.getHttpServer()).get("/auth/me").expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_SESSION",
      message: "Invalid session.",
    });
  });

  it("GET /auth/me with invalid token returns 401", async () => {
    const response = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_SESSION",
      message: "Invalid session.",
    });
  });
});
