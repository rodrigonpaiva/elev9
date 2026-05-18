import {
  ActivityLevel,
  FitnessGoal,
  FitnessProfileLimitation,
} from '../../../domain/entities/fitness-profile.entity';

export type CreateFitnessProfileInput = {
  authUserId: string;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  trainingAvailability: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  limitations?: FitnessProfileLimitation[];
};
