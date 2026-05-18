import { AccessTokenVerifier } from '../../../domain/services/access-token-verifier.service';
import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from './validate-session.errors';
import { ValidateSessionUseCase } from './validate-session.use-case';

describe('ValidateSessionUseCase', () => {
  let accessTokenVerifier: jest.Mocked<AccessTokenVerifier>;
  let useCase: ValidateSessionUseCase;

  beforeEach(() => {
    accessTokenVerifier = {
      verifyAccessToken: jest.fn(),
    };

    useCase = new ValidateSessionUseCase(accessTokenVerifier);
  });

  it('validates session successfully', async () => {
    accessTokenVerifier.verifyAccessToken.mockResolvedValue({
      sub: 'usr_123',
      email: 'rodrigo@email.com',
    });

    const result = await useCase.execute({
      authorizationHeader: 'Bearer valid-token',
    });

    expect(result).toEqual({
      user: {
        id: 'usr_123',
        email: 'rodrigo@email.com',
      },
    });
  });

  it('accepts bearer case-insensitively', async () => {
    accessTokenVerifier.verifyAccessToken.mockResolvedValue({
      sub: 'usr_123',
      email: 'rodrigo@email.com',
    });

    await useCase.execute({
      authorizationHeader: 'bearer valid-token',
    });

    expect(accessTokenVerifier.verifyAccessToken).toHaveBeenCalledWith(
      'valid-token',
    );
  });

  it('returns AUTH_INVALID_SESSION when token is missing', async () => {
    await expect(
      useCase.execute({
        authorizationHeader: '',
      }),
    ).rejects.toMatchObject({
      code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('returns AUTH_INVALID_SESSION for malformed authorization header', async () => {
    await expect(
      useCase.execute({
        authorizationHeader: 'Basic abc.def.ghi',
      }),
    ).rejects.toMatchObject({
      code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('returns AUTH_INVALID_SESSION for invalid token', async () => {
    accessTokenVerifier.verifyAccessToken.mockRejectedValue(
      new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      useCase.execute({
        authorizationHeader: 'Bearer invalid-token',
      }),
    ).rejects.toMatchObject({
      code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('returns only safe user fields', async () => {
    accessTokenVerifier.verifyAccessToken.mockResolvedValue({
      sub: 'usr_123',
      email: 'rodrigo@email.com',
    });

    const result = await useCase.execute({
      authorizationHeader: 'Bearer valid-token',
    });

    expect(result).not.toHaveProperty('accessToken');
    expect(result.user).toEqual({
      id: 'usr_123',
      email: 'rodrigo@email.com',
    });
  });
});
