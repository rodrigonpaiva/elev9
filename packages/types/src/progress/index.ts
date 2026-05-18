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
    difficulty: 'easy' | 'medium' | 'hard';
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
      difficulty: 'easy' | 'medium' | 'hard';
      notes?: string;
    };
    date: string;
    createdAt: string;
  };
};

export type CreateDailyCheckInRequest = {
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
};

export type DailyCheckIn = {
  id: string;
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
  createdAt: string;
};

export type DailyCheckInResponse = {
  dailyCheckIn: DailyCheckIn;
};

export type GetDailyCheckInHistoryQuery = {
  limit?: number;
};

export type DailyCheckInHistoryResponse = {
  dailyCheckIns: DailyCheckIn[];
};

export type ProgressSummaryResponse = {
  summary: {
    period: 'week' | 'month';
    workoutsCompleted: number;
    totalDurationMinutes: number;
    averageDurationMinutes: number;
    lastWorkoutDate: string | null;
    currentStreak: number;
  };
};

export type WorkoutHistoryResponse = {
  workoutLogs: Array<{
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
      difficulty: 'easy' | 'medium' | 'hard';
      notes?: string;
    };
    date: string;
    createdAt: string;
  }>;
};
