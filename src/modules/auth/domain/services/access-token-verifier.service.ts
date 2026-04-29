export interface AccessTokenVerifierPayload {
  sub: string;
  email: string;
}

export interface AccessTokenVerifier {
  verifyAccessToken(token: string): Promise<AccessTokenVerifierPayload>;
}

export const ACCESS_TOKEN_VERIFIER = Symbol("ACCESS_TOKEN_VERIFIER");
