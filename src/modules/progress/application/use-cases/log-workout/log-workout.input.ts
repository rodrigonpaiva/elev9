export type LogWorkoutInput = {
  authUserId: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  durationMinutes: number;
  completedExercises: Array<{
    name: string;
    setsDone: number;
    repsDone: number;
  }>;
  feedback?: {
    difficulty: "easy" | "medium" | "hard";
    notes?: string;
  };
};
