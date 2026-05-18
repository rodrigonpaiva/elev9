import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  AccessTokenSigner,
  AccessTokenSignerPayload,
} from '../../domain/services/access-token-signer.service';

const ACCESS_TOKEN_EXPIRES_IN = '15m';

@Injectable()
export class JwtAccessTokenSignerService implements AccessTokenSigner {
  constructor(private readonly jwtService: JwtService) {}

  async signAccessToken(payload: AccessTokenSignerPayload): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
      },
      {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    );
  }
}
