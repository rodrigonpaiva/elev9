export class LoginUserResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string;
  };
}
