export type RegistrationFormInput = {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type RegistrationValidation = {
  nameError: string | null;
  emailError: string | null;
  passwordError: string | null;
  passwordConfirmationError: string | null;
  isValid: boolean;
};

export function validateRegistrationForm(
  input: RegistrationFormInput,
): RegistrationValidation {
  const name = input.name.trim();
  const email = input.email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid =
    input.password.length >= 8 &&
    input.password.length <= 128 &&
    /[A-Z]/.test(input.password) &&
    /[a-z]/.test(input.password) &&
    /[0-9]/.test(input.password);

  const validation = {
    nameError:
      name.length === 0
        ? 'Enter your name.'
        : name.length < 2 || name.length > 80
          ? 'Use a name between 2 and 80 characters.'
          : null,
    emailError:
      email.length === 0
        ? 'Enter your email.'
        : !isEmailValid
          ? 'Enter a valid email.'
          : null,
    passwordError:
      input.password.length === 0
        ? 'Create a password.'
        : !isPasswordValid
          ? 'Use 8–128 characters with uppercase, lowercase, and a number.'
          : null,
    passwordConfirmationError:
      input.passwordConfirmation.length === 0
        ? 'Confirm your password.'
        : input.passwordConfirmation !== input.password
          ? 'Passwords do not match.'
          : null,
  } satisfies Omit<RegistrationValidation, 'isValid'>;

  return {
    ...validation,
    isValid: Object.values(validation).every((error) => error === null),
  };
}

export function getRegistrationErrorMessage(error: unknown): string {
  if (isApiClientErrorLike(error)) {
    switch (error.code) {
      case 'AUTH_EMAIL_ALREADY_EXISTS':
        return 'An account with this email already exists. Sign in instead.';
      case 'AUTH_PASSWORD_TOO_WEAK':
        return 'Choose a stronger password with uppercase, lowercase, and a number.';
      case 'AUTH_INVALID_INPUT':
        return 'Check your name, email, and password and try again.';
      case 'NETWORK_ERROR':
        return 'We could not reach Elev9. Check your connection and try again.';
      case 'AUTH_INTERNAL_ERROR':
        return 'We could not create your account. Try again shortly.';
      default:
        return error.message || 'We could not create your account.';
    }
  }

  return 'We could not create your account. Try again.';
}

function isApiClientErrorLike(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}
