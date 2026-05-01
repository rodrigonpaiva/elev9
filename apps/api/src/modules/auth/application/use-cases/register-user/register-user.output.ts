export type RegisterUserOutput = {
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: Date;
  };
};
