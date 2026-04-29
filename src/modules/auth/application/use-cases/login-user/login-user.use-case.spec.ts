import { AuthUser } from "../../../domain/entities/auth-user.entity";
import { AuthUserRepository } from "../../../domain/repositories/auth-user.repository";
import {
  AccessTokenSigner,
} from "../../../domain/services/access-token-signer.service";
import { PasswordHasher } from "../../../domain/services/password-hasher.service";
import {
  LOGIN_USER_ERROR_CODES,
  LoginUserError,
} from "./login-user.errors";
import { LoginUserUseCase } from "./login-user.use-case";

describe("LoginUserUseCase", () => {
  let authUserRepository: jest.Mocked<AuthUserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let accessTokenSigner: jest.Mocked<AccessTokenSigner>;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    authUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    accessTokenSigner = {
      signAccessToken: jest.fn(),
    };

    useCase = new LoginUserUseCase(
      authUserRepository,
      passwordHasher,
      accessTokenSigner,
    );
  });

  it("logs in successfully", async () => {
    authUserRepository.findByEmail.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );
    passwordHasher.compare.mockResolvedValue(true);
    accessTokenSigner.signAccessToken.mockResolvedValue("jwt-token-value");

    const result = await useCase.execute({
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(result).toEqual({
      accessToken: "jwt-token-value",
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
      },
    });
  });

  it("returns AUTH_INVALID_CREDENTIALS for nonexistent email", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: "missing@email.com",
        password: "StrongPassword123",
      }),
    ).rejects.toMatchObject({
      code: LOGIN_USER_ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("returns AUTH_INVALID_CREDENTIALS for incorrect password", async () => {
    authUserRepository.findByEmail.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: "rodrigo@email.com",
        password: "WrongPassword123",
      }),
    ).rejects.toMatchObject({
      code: LOGIN_USER_ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("normalizes email with trim and lowercase", async () => {
    authUserRepository.findByEmail.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );
    passwordHasher.compare.mockResolvedValue(true);
    accessTokenSigner.signAccessToken.mockResolvedValue("jwt-token-value");

    await useCase.execute({
      email: " Rodrigo@Email.COM ",
      password: "StrongPassword123",
    });

    expect(authUserRepository.findByEmail).toHaveBeenCalledWith(
      "rodrigo@email.com",
    );
  });

  it("does not expose password or passwordHash in response", async () => {
    authUserRepository.findByEmail.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );
    passwordHasher.compare.mockResolvedValue(true);
    accessTokenSigner.signAccessToken.mockResolvedValue("jwt-token-value");

    const result = await useCase.execute({
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(passwordHasher.compare).toHaveBeenCalledWith(
      "StrongPassword123",
      "hashed-password",
    );
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("password");
    expect(result.user).not.toHaveProperty("passwordHash");
  });
});
