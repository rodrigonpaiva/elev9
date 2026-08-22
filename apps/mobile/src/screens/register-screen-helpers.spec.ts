import { ApiClientError } from '@elev9/api-client';

import {
  getRegistrationErrorMessage,
  validateRegistrationForm,
} from './register-screen-helpers';

describe('register screen helpers', () => {
  it('accepts a valid form and rejects missing or invalid fields locally', () => {
    expect(
      validateRegistrationForm({
        name: 'New Athlete',
        email: 'new@example.com',
        password: 'StrongPassword123',
        passwordConfirmation: 'StrongPassword123',
      }),
    ).toEqual({
      nameError: null,
      emailError: null,
      passwordError: null,
      passwordConfirmationError: null,
      isValid: true,
    });

    const invalid = validateRegistrationForm({
      name: '',
      email: 'not-an-email',
      password: 'weak',
      passwordConfirmation: 'different',
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.nameError).toBeTruthy();
    expect(invalid.emailError).toBeTruthy();
    expect(invalid.passwordError).toBeTruthy();
    expect(invalid.passwordConfirmationError).toBeTruthy();
  });

  it('maps API and network errors to actionable messages without exposing credentials', () => {
    expect(
      getRegistrationErrorMessage(
        new ApiClientError({
          code: 'AUTH_EMAIL_ALREADY_EXISTS',
          message: 'Email already exists.',
          status: 409,
        }),
      ),
    ).toContain('already exists');
    expect(
      getRegistrationErrorMessage(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the Elev9 API.',
          status: 0,
        }),
      ),
    ).toContain('connection');
    expect(
      getRegistrationErrorMessage(new Error('password=secret')),
    ).not.toContain('secret');
  });
});
