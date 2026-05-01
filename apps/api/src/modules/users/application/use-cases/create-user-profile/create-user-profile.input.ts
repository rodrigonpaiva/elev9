export type CreateUserProfileInput = {
  authUserId: string;
  name: string;
  birthDate?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
};
