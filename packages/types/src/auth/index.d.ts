export type LoginUserRequest = {
  email: string;
  password: string;
};
export type LoginUserResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
};
export type RegisterUserRequest = {
  name: string;
  email: string;
  password: string;
};
export type RegisterUserResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: string;
  };
};
