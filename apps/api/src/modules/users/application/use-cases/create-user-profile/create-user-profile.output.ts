export type CreateUserProfileOutput = {
  userProfile: {
    id: string;
    authUserId: string;
    name: string;
    birthDate?: Date;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
    language: "en-US";
    timezone: "UTC";
    status: "active";
    createdAt: Date;
  };
};
