import type {
  LoginUserResponse,
  RegisterUserRequest,
  RegisterUserResponse,
} from '@elev9/types';

export type RegistrationFlowDependencies = {
  register(input: RegisterUserRequest): Promise<RegisterUserResponse>;
  login(input: { email: string; password: string }): Promise<LoginUserResponse>;
  persistSession(response: LoginUserResponse): Promise<void>;
  clearPartialSession(): Promise<void>;
};

export async function registerAndCreateSession(
  input: RegisterUserRequest,
  dependencies: RegistrationFlowDependencies,
): Promise<void> {
  try {
    await dependencies.register(input);
    const loginResponse = await dependencies.login({
      email: input.email,
      password: input.password,
    });
    await dependencies.persistSession(loginResponse);
  } catch (error) {
    try {
      await dependencies.clearPartialSession();
    } catch {
      // Cleanup must not hide the actionable registration error.
    }
    throw error;
  }
}

export function createRegistrationSubmitter(
  submit: (input: RegisterUserRequest) => Promise<void>,
): (input: RegisterUserRequest) => Promise<void> {
  let inFlight: Promise<void> | null = null;

  return (input) => {
    if (inFlight) {
      return inFlight;
    }

    inFlight = submit(input).finally(() => {
      inFlight = null;
    });

    return inFlight;
  };
}
