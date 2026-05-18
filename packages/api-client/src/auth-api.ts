import type {
  LoginUserRequest,
  LoginUserResponse,
  RegisterUserRequest,
  RegisterUserResponse,
} from '@elev9/types';

import type { HttpClient } from './http-client';

export function createAuthApi(httpClient: HttpClient) {
  return {
    login(input: LoginUserRequest): Promise<LoginUserResponse> {
      return httpClient.request<LoginUserResponse>({
        method: 'POST',
        path: '/auth/login',
        body: input,
      });
    },
    register(input: RegisterUserRequest): Promise<RegisterUserResponse> {
      return httpClient.request<RegisterUserResponse>({
        method: 'POST',
        path: '/auth/register',
        body: input,
      });
    },
  };
}
