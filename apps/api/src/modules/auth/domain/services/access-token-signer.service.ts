export interface AccessTokenSignerPayload {
  sub: string;
  email: string;
}

export interface AccessTokenSigner {
  signAccessToken(payload: AccessTokenSignerPayload): Promise<string>;
}

export const ACCESS_TOKEN_SIGNER = Symbol("ACCESS_TOKEN_SIGNER");
