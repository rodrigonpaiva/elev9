import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PasswordHasher } from '../../domain/services/password-hasher.service';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasherService implements PasswordHasher {
  async hash(rawPassword: string): Promise<string> {
    return bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);
  }

  async compare(rawPassword: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(rawPassword, passwordHash);
  }
}
