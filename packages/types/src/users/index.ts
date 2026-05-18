export type CreateUserProfileRequest = {
  name: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
};

export type UserProfileResponse = {
  userProfile: {
    id: string;
    authUserId: string;
    name: string;
    birthDate?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    language: 'en-US';
    timezone: 'UTC';
    status: 'active';
    createdAt: string;
  };
};
