import { UserProfile } from '../entities/user-profile.entity';

export interface CreateUserProfileRepositoryInput {
  authUserId: string;
  name: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  language: 'en-US';
  timezone: 'UTC';
  status: 'active';
}

export interface UserProfileRepository {
  findByAuthUserId(authUserId: string): Promise<UserProfile | null>;
  create(input: CreateUserProfileRepositoryInput): Promise<UserProfile>;
}

export const USER_PROFILE_REPOSITORY = Symbol('USER_PROFILE_REPOSITORY');
