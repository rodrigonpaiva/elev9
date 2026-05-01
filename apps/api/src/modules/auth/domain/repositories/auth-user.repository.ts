import { AuthUser } from "../entities/auth-user.entity";

export interface CreateAuthUserRepositoryInput {
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
}

export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  create(input: CreateAuthUserRepositoryInput): Promise<AuthUser>;
}

export const AUTH_USER_REPOSITORY = Symbol("AUTH_USER_REPOSITORY");
