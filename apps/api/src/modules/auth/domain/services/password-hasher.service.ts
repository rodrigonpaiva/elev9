export interface PasswordHasher {
  hash(rawPassword: string): Promise<string>;
  compare(rawPassword: string, passwordHash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol("PASSWORD_HASHER");
