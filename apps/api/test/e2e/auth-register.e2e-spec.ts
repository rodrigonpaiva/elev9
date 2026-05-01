import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoMemoryServer } from "mongodb-memory-server";
import { disconnect } from "mongoose";
import request from "supertest";

import { AuthModule } from "../../src/modules/auth/auth.module";

describe("Auth Register E2E", () => {
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

  it("registers user successfully", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "  Rodrigo Paiva  ",
        email: " Rodrigo@Email.COM ",
        password: "StrongPassword123",
      })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: "rodrigo@email.com",
        name: "Rodrigo Paiva",
        isEmailVerified: false,
        createdAt: expect.any(String),
      },
    });
  });

  it("returns duplicate email on second registration", async () => {
    const payload = {
      name: "Rodrigo Paiva",
      email: "duplicate@email.com",
      password: "StrongPassword123",
    };

    await request(app.getHttpServer())
      .post("/auth/register")
      .send(payload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send(payload)
      .expect(409);

    expect(response.body).toEqual({
      code: "AUTH_EMAIL_ALREADY_EXISTS",
      message: "Email already exists.",
    });
  });
});
