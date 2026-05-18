import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { LoginUserUseCase } from './application/use-cases/login-user/login-user.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user/register-user.use-case';
import { ValidateSessionUseCase } from './application/use-cases/validate-session/validate-session.use-case';
import { AUTH_USER_REPOSITORY } from './domain/repositories/auth-user.repository';
import { ACCESS_TOKEN_SIGNER } from './domain/services/access-token-signer.service';
import { ACCESS_TOKEN_VERIFIER } from './domain/services/access-token-verifier.service';
import { PASSWORD_HASHER } from './domain/services/password-hasher.service';
import {
  AUTH_USER_MODEL_NAME,
  AuthUserSchema,
} from './infrastructure/mongoose/auth-user.schema';
import { MongooseAuthUserRepository } from './infrastructure/mongoose/mongoose-auth-user.repository';
import { BcryptPasswordHasherService } from './infrastructure/security/bcrypt-password-hasher.service';
import { JwtAccessTokenSignerService } from './infrastructure/security/jwt-access-token-signer.service';
import { JwtAccessTokenVerifierService } from './infrastructure/security/jwt-access-token-verifier.service';
import { AuthController } from './presentation/http/auth.controller';

const JWT_ACCESS_TOKEN_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_ACCESS_TOKEN_SECRET,
    }),
    MongooseModule.forFeature([
      {
        name: AUTH_USER_MODEL_NAME,
        schema: AuthUserSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    LoginUserUseCase,
    RegisterUserUseCase,
    ValidateSessionUseCase,
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: MongooseAuthUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasherService,
    },
    {
      provide: ACCESS_TOKEN_SIGNER,
      useClass: JwtAccessTokenSignerService,
    },
    {
      provide: ACCESS_TOKEN_VERIFIER,
      useClass: JwtAccessTokenVerifierService,
    },
  ],
  exports: [RegisterUserUseCase, LoginUserUseCase, ValidateSessionUseCase],
})
export class AuthModule {}
