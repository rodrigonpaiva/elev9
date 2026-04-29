import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { ValidateSessionUseCase } from "../../../auth/application/use-cases/validate-session/validate-session.use-case";
import {
  CREATE_USER_PROFILE_ERROR_CODES,
  CreateUserProfileError,
} from "../../application/use-cases/create-user-profile/create-user-profile.errors";
import { CreateUserProfileUseCase } from "../../application/use-cases/create-user-profile/create-user-profile.use-case";
import { UsersController } from "./users.controller";
import { AuthSessionGuard } from "./guards/auth-session.guard";

describe("UsersController", () => {
  let app: INestApplication;
  const createUserProfileUseCase = {
    execute: jest.fn(),
  };
  const validateSessionUseCase = {
    execute: jest.fn().mockResolvedValue({
      user: {
        id: "auth_user_123",
        email: "user@email.com",
      },
    }),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: CreateUserProfileUseCase,
          useValue: createUserProfileUseCase,
        },
        {
          provide: ValidateSessionUseCase,
          useValue: validateSessionUseCase,
        },
        {
          provide: AuthSessionGuard,
          useValue: {
            canActivate: (context: {
              switchToHttp: () => {
                getRequest: () => {
                  authUser?: {
                    id: string;
                    email: string;
                  };
                };
              };
            }) => {
              context.switchToHttp().getRequest().authUser = {
                id: "usr_123",
                email: "rodrigo@email.com",
              };

              return true;
            },
          },
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
    if (app) {
      await app.close();
    }
  });

  it("POST /users/profile success", async () => {
    createUserProfileUseCase.execute.mockResolvedValue({
      userProfile: {
        id: "profile_123",
        authUserId: "usr_123",
        name: "Rodrigo Paiva",
        birthDate: new Date("1994-06-15T00:00:00.000Z"),
        gender: "male",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
      },
    });

    const response = await request(app.getHttpServer())
      .post("/users/profile")
      .send({
        name: "Rodrigo Paiva",
        birthDate: "1994-06-15",
        gender: "male",
      })
      .expect(201);

    expect(response.body).toEqual({
      userProfile: {
        id: "profile_123",
        authUserId: "usr_123",
        name: "Rodrigo Paiva",
        birthDate: "1994-06-15T00:00:00.000Z",
        gender: "male",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: "2026-04-28T10:00:00.000Z",
      },
    });
  });

  it("returns 409 when profile already exists", async () => {
    createUserProfileUseCase.execute.mockRejectedValue(
      new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
        "User profile already exists.",
      ),
    );

    const response = await request(app.getHttpServer())
      .post("/users/profile")
      .send({
        name: "Rodrigo Paiva",
      })
      .expect(409);

    expect(response.body).toEqual({
      code: CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
      message: "User profile already exists.",
    });
  });
});
