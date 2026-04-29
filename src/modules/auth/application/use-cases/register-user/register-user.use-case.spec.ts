import { AuthUser } from "../../../domain/entities/auth-user.entity";
import {
  AuthUserRepository,
  CreateAuthUserRepositoryInput,
} from "../../../domain/repositories/auth-user.repository";
import { PasswordHasher } from "../../../domain/services/password-hasher.service";
import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from "./register-user.errors";
import { RegisterUserUseCase } from "./register-user.use-case";

describe("RegisterUserUseCase", () => {
  let authUserRepository: jest.Mocked<AuthUserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    authUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new RegisterUserUseCase(authUserRepository, passwordHasher);
  });

  it("registers user successfully", async () => {
    const createdAt = new Date("2026-04-28T10:00:00.000Z");

    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt,
        updatedAt: createdAt,
      }),
    );

    const result = await useCase.execute({
      name: "Rodrigo Paiva",
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(result).toEqual({
      user: {
        id: "usr_123",
        email: "rodrigo@email.com",
        name: "Rodrigo Paiva",
        isEmailVerified: false,
        createdAt,
      },
    });
  });

  it("normalizes email with trim and lowercase", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockImplementation(
      async (input: CreateAuthUserRepositoryInput) =>
        new AuthUser({
          id: "usr_123",
          email: input.email,
          passwordHash: input.passwordHash,
          isEmailVerified: input.isEmailVerified,
          createdAt: new Date("2026-04-28T10:00:00.000Z"),
          updatedAt: new Date("2026-04-28T10:00:00.000Z"),
        }),
    );

    await useCase.execute({
      name: "Rodrigo Paiva",
      email: " Rodrigo@Email.COM ",
      password: "StrongPassword123",
    });

    expect(authUserRepository.findByEmail).toHaveBeenCalledWith(
      "rodrigo@email.com",
    );
    expect(authUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "rodrigo@email.com",
      }),
    );
  });

  it("trims name before validation and output", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    const result = await useCase.execute({
      name: "  Rodrigo Paiva  ",
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(result.user.name).toBe("Rodrigo Paiva");
  });

  it("hashes password before persistence", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    await useCase.execute({
      name: "Rodrigo Paiva",
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith("StrongPassword123");
    expect(authUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: "hashed-password",
      }),
    );
  });

  it("creates user with isEmailVerified false", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    await useCase.execute({
      name: "Rodrigo Paiva",
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(authUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isEmailVerified: false,
      }),
    );
  });

  it("returns AUTH_EMAIL_ALREADY_EXISTS when email already exists", async () => {
    authUserRepository.findByEmail.mockResolvedValue(
      new AuthUser({
        id: "usr_existing",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    await expect(
      useCase.execute({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "StrongPassword123",
      }),
    ).rejects.toMatchObject({
      code: REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
    });
  });

  it("returns AUTH_PASSWORD_TOO_WEAK for weak password", async () => {
    await expect(
      useCase.execute({
        name: "Rodrigo Paiva",
        email: "rodrigo@email.com",
        password: "123",
      }),
    ).rejects.toMatchObject({
      code: REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
    });
  });

  it("returns AUTH_INVALID_INPUT for invalid input", async () => {
    await expect(
      useCase.execute({
        name: " ",
        email: "invalid-email",
        password: "StrongPassword123",
      }),
    ).rejects.toMatchObject({
      code: REGISTER_USER_ERROR_CODES.INVALID_INPUT,
    });
  });

  it("never returns password or passwordHash in response", async () => {
    authUserRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue("hashed-password");
    authUserRepository.create.mockResolvedValue(
      new AuthUser({
        id: "usr_123",
        email: "rodrigo@email.com",
        passwordHash: "hashed-password",
        isEmailVerified: false,
        createdAt: new Date("2026-04-28T10:00:00.000Z"),
        updatedAt: new Date("2026-04-28T10:00:00.000Z"),
      }),
    );

    const result = await useCase.execute({
      name: "Rodrigo Paiva",
      email: "rodrigo@email.com",
      password: "StrongPassword123",
    });

    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("password");
    expect(result.user).not.toHaveProperty("passwordHash");
  });
});
