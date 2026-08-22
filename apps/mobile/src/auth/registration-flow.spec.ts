import { ApiClientError } from '@elev9/api-client';
import type { LoginUserResponse, RegisterUserResponse } from '@elev9/types';

import {
  createRegistrationSubmitter,
  registerAndCreateSession,
} from './registration-flow';

const input = {
  name: 'New Athlete',
  email: 'new@example.com',
  password: 'StrongPassword123',
};

const registrationResponse: RegisterUserResponse = {
  user: {
    id: 'user-1',
    email: input.email,
    name: input.name,
    isEmailVerified: false,
    createdAt: '2026-08-22T00:00:00.000Z',
  },
};

const loginResponse: LoginUserResponse = {
  accessToken: 'token-not-recorded',
  user: { id: 'user-1', email: input.email },
};

function createDependencies() {
  return {
    register: jest.fn(async () => registrationResponse),
    login: jest.fn(async () => loginResponse),
    persistSession: jest.fn(async () => undefined),
    clearPartialSession: jest.fn(async () => undefined),
  };
}

describe('registration flow', () => {
  it('registers, logs in, and persists the session without storing the password', async () => {
    const dependencies = createDependencies();

    await registerAndCreateSession(input, dependencies);

    expect(dependencies.register).toHaveBeenCalledWith(input);
    expect(dependencies.login).toHaveBeenCalledWith({
      email: input.email,
      password: input.password,
    });
    expect(dependencies.persistSession).toHaveBeenCalledWith(loginResponse);
    expect(dependencies.clearPartialSession).not.toHaveBeenCalled();
  });

  it('does not attempt login when the email already exists', async () => {
    const dependencies = createDependencies();
    dependencies.register.mockRejectedValue(
      new ApiClientError({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'Email already exists.',
        status: 409,
      }),
    );

    await expect(
      registerAndCreateSession(input, dependencies),
    ).rejects.toMatchObject({
      code: 'AUTH_EMAIL_ALREADY_EXISTS',
    });
    expect(dependencies.login).not.toHaveBeenCalled();
    expect(dependencies.clearPartialSession).toHaveBeenCalledTimes(1);
  });

  it('clears partial local session state after invalid payload or network failure', async () => {
    for (const error of [
      new ApiClientError({
        code: 'AUTH_INVALID_INPUT',
        message: 'Invalid input.',
        status: 400,
      }),
      new ApiClientError({
        code: 'NETWORK_ERROR',
        message: 'Unable to reach the Elev9 API.',
        status: 0,
      }),
    ]) {
      const dependencies = createDependencies();
      dependencies.register.mockRejectedValue(error);

      await expect(registerAndCreateSession(input, dependencies)).rejects.toBe(
        error,
      );
      expect(dependencies.clearPartialSession).toHaveBeenCalledTimes(1);
    }
  });

  it('clears local state if login fails after registration succeeds', async () => {
    const dependencies = createDependencies();
    const error = new ApiClientError({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the Elev9 API.',
      status: 0,
    });
    dependencies.login.mockRejectedValue(error);

    await expect(registerAndCreateSession(input, dependencies)).rejects.toBe(
      error,
    );
    expect(dependencies.persistSession).not.toHaveBeenCalled();
    expect(dependencies.clearPartialSession).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request when the submit action is pressed twice', async () => {
    let resolveSubmit: (() => void) | undefined;
    const submit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    const submitOnce = createRegistrationSubmitter(submit);

    const first = submitOnce(input);
    const second = submitOnce(input);
    resolveSubmit?.();
    await Promise.all([first, second]);

    expect(first).toBe(second);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
