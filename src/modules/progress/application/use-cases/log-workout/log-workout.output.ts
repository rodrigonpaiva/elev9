export type LogWorkoutOutput = {
  workoutLog: {
    id: string;
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
    date: string;
    createdAt: Date;
  };
};
