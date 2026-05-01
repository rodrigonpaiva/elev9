export type LogWorkoutRequest = {
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

export type LogWorkoutResponse = {
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
    createdAt: string;
  };
};

export type ProgressSummaryResponse = {
  summary: {
    period: "week" | "month";
    workoutsCompleted: number;
    totalDurationMinutes: number;
    averageDurationMinutes: number;
    lastWorkoutDate: string | null;
  };
};
