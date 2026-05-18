export class GetMyFitnessProfileResponseDto {
  fitnessProfile!: {
    id: string;
    userProfileId: string;
    heightCm: number;
    weightKg: number;
    goal: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel: 'low' | 'medium' | 'high';
    trainingAvailability: {
      daysPerWeek: number;
      minutesPerSession: number;
    };
    limitations: Array<{
      type: string;
      description?: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    status: 'active';
    createdAt: string;
  };
}
