import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { disconnect } from "mongoose";
import request from "supertest";

import { AuthModule } from "../../src/modules/auth/auth.module";

describe("Auth Login E2E", () => {
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

  it("POST /auth/login success", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "login-success@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: " Login-Success@Email.com ",
        password: "StrongPassword123",
      })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      user: {
        id: expect.any(String),
        email: "login-success@email.com",
      },
    });
  });

  it("login with wrong password returns 401", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "wrong-password@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "wrong-password@email.com",
        password: "WrongPassword123",
      })
      .expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials.",
    });
  });

  it("login with nonexistent email returns 401", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({
        email: "missing@email.com",
        password: "StrongPassword123",
      })
      .expect(401);

    expect(response.body).toEqual({
      code: "AUTH_INVALID_CREDENTIALS",
      message: "Invalid credentials.",
    });
  });
});
