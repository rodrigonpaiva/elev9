export class StartWorkoutResponseDto {
  workoutSession!: {
    id: string;
    userProfileId: string;
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
    status: 'active' | 'completed';
    startedAt: string;
    updatedAt: string;
    completedAt?: string;
  };
}
