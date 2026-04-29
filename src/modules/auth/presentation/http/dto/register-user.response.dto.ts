export class RegisterUserResponseDto {
  user!: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
    createdAt: string;
  };
}
