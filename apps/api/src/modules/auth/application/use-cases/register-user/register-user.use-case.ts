import { Inject, Injectable } from "@nestjs/common";

import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from "../../../domain/repositories/auth-user.repository";
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from "../../../domain/services/password-hasher.service";
import { RegisterUserInput } from "./register-user.input";
import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from "./register-user.errors";
import { RegisterUserOutput } from "./register-user.output";

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const normalizedName =
      typeof input.name === "string" ? input.name.trim() : "";
    const normalizedEmail =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const rawPassword = typeof input.password === "string" ? input.password : "";

    this.validateInput({
      name: normalizedName,
      email: normalizedEmail,
      password: rawPassword,
    });

    try {
      const existingUser =
        await this.authUserRepository.findByEmail(normalizedEmail);

      if (existingUser) {
        throw new RegisterUserError(
          REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
          "Email already exists.",
        );
      }

      const passwordHash = await this.passwordHasher.hash(rawPassword);

      const authUser = await this.authUserRepository.create({
        email: normalizedEmail,
        passwordHash,
        isEmailVerified: false,
      });

      return {
        user: {
          id: authUser.id,
          email: authUser.email,
          name: normalizedName,
          isEmailVerified: authUser.isEmailVerified,
          createdAt: authUser.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof RegisterUserError) {
        throw error;
      }

      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private validateInput(input: RegisterUserInput): void {
    if (!input.name || !input.email || !input.password) {
      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INVALID_INPUT,
        "Invalid input.",
      );
    }

    if (input.name.length < 2 || input.name.length > 80) {
      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INVALID_INPUT,
        "Invalid input.",
      );
    }

    if (!this.isValidEmail(input.email)) {
      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INVALID_INPUT,
        "Invalid input.",
      );
    }

    if (input.password.length < 8) {
      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
        "Password does not meet security requirements.",
      );
    }

    if (
      !/[A-Z]/.test(input.password) ||
      !/[a-z]/.test(input.password) ||
      !/[0-9]/.test(input.password)
    ) {
      throw new RegisterUserError(
        REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
        "Password does not meet security requirements.",
      );
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
