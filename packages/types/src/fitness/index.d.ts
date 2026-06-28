export type FitnessProfileGoal = 'lose_weight' | 'gain_muscle' | 'maintain';
export type FitnessProfileActivityLevel = 'low' | 'medium' | 'high';
export type FitnessProfileLimitationSeverity = 'low' | 'medium' | 'high';
export type FitnessProfileResponse = {
  fitnessProfile: {
    id: string;
    userProfileId: string;
    heightCm: number;
    weightKg: number;
    goal: FitnessProfileGoal;
    activityLevel: FitnessProfileActivityLevel;
    trainingAvailability: {
      daysPerWeek: number;
      minutesPerSession: number;
    };
    limitations: Array<{
      type: string;
      description?: string;
      severity: FitnessProfileLimitationSeverity;
    }>;
    status: 'active';
    createdAt: string;
  };
};
