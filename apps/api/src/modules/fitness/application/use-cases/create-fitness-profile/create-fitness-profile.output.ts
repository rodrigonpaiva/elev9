import {
  ActivityLevel,
  FitnessGoal,
  FitnessProfileLimitation,
} from '../../../domain/entities/fitness-profile.entity';

export type CreateFitnessProfileOutput = {
  fitnessProfile: {
    id: string;
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
    status: 'active';
    createdAt: Date;
  };
};
