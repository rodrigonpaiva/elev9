import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from "../../application/use-cases/register-user/register-user.errors";
import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from "../../application/use-cases/validate-session/validate-session.errors";
import { LoginUserUseCase } from "../../application/use-cases/login-user/login-user.use-case";
import { RegisterUserUseCase } from "../../application/use-cases/register-user/register-user.use-case";
import { ValidateSessionUseCase } from "../../application/use-cases/validate-session/validate-session.use-case";
import { AuthController } from "./auth.controller";

describe("AuthController", () => {
  let app: INestApplication;
  const registerUserUseCase = {
    execute: jest.fn(),
  };
  const loginUserUseCase = {
    execute: jest.fn(),
  };
  const validateSessionUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: RegisterUserUseCase,
          useValue: registerUserUseCase,
        },
        {
          provide: LoginUserUseCase,
          useValue: loginUserUseCase,
        },
        {
          provide: ValidateSessionUseCase,
          useValue: validateSessionUseCase,
        },
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

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it("POST /auth/register success", async () => {
    registerUserUseCase.execute.mockResolvedValue({
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
        name: "Rodrigo Paiva",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    });

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
        name: "Rodrigo Paiva",
        isEmailVerified: false,
        createdAt: "2026-04-28T10:00:00.000Z",
      },
    });
  });

  it("returns HTTP 409 for AUTH_EMAIL_ALREADY_EXISTS", async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
        "Email already exists.",
      ),
    );

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      })
      .expect(409);

    expect(response.body).toEqual({
      code: REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
      message: "Email already exists.",
    });
  });

  it("returns HTTP 400 for AUTH_INVALID_INPUT", async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INVALID_INPUT,
        "Invalid input.",
      ),
    );

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      })
      .expect(400);

    expect(response.body).toEqual({
      code: REGISTER_USER_ERROR_CODES.INVALID_INPUT,
      message: "Invalid input.",
    });
  });

  it("returns HTTP 400 for AUTH_PASSWORD_TOO_WEAK", async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
        "Password does not meet security requirements.",
      ),
    );

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      })
      .expect(400);

    expect(response.body).toEqual({
      code: REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
      message: "Password does not meet security requirements.",
    });
  });

  it("returns HTTP 500 for AUTH_INTERNAL_ERROR", async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      ),
    );

    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      })
      .expect(500);

    expect(response.body).toEqual({
      code: REGISTER_USER_ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected error occurred.",
    });
  });

  it("GET /auth/me success", async () => {
    validateSessionUseCase.execute.mockResolvedValue({
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
      },
    });

    const response = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Authorization", "Bearer valid-token")
      .expect(200);

    expect(response.body).toEqual({
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
      },
    });
  });

  it("GET /auth/me returns HTTP 401 for AUTH_INVALID_SESSION", async () => {
    validateSessionUseCase.execute.mockRejectedValue(
      new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    const response = await request(app.getHttpServer())
      .get("/auth/me")
      .expect(401);

    expect(response.body).toEqual({
      code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
      message: "Invalid session.",
    });
  });
});
