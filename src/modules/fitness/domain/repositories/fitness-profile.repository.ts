import {
  ActivityLevel,
  FitnessGoal,
  FitnessProfile,
  FitnessProfileLimitation,
} from "../entities/fitness-profile.entity";

export interface CreateFitnessProfileRepositoryInput {
  userProfileId: string;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  trainingAvailability: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  limitations: FitnessProfileLimitation[];
  status: "active";
}

export interface FitnessProfileRepository {
  findActiveByUserProfileId(userProfileId: string): Promise<FitnessProfile | null>;
  create(input: CreateFitnessProfileRepositoryInput): Promise<FitnessProfile>;
}

export const FITNESS_PROFILE_REPOSITORY = Symbol("FITNESS_PROFILE_REPOSITORY");
