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
    replacements: Array<{
      exerciseIndex: number;
      originalExercise: {
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      };
      replacementExercise: {
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      };
      reason: string;
      idempotencyKey: string;
      replacedAt: string;
    }>;
  };
}
