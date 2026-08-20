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

/** Values accepted by the canonical daily check-in submission endpoint. */
export type SubmitDailyCheckInRequest = {
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
};

/** @deprecated Use SubmitDailyCheckInRequest. */
export type CreateDailyCheckInRequest = SubmitDailyCheckInRequest;

/** A calendar date resolved by the API in YYYY-MM-DD format. */
export type LocalDate = string;

/** JSON transport representation of an instant in time. */
export type IsoDateTime = string;

/** The effective profile timezone returned by the API. */
export type Timezone = string;

export type DailyCheckIn = {
  id: string;
  energyLevel: number;
  sleepQuality: number;
  muscleSoreness: number;
  motivationLevel: number;
  localDate: LocalDate;
  timezone: Timezone;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Minimal read model used by contexts that do not expose day metadata. */
export type DailyCheckInSummary = Pick<
  DailyCheckIn,
  | 'id'
  | 'energyLevel'
  | 'sleepQuality'
  | 'muscleSoreness'
  | 'motivationLevel'
  | 'createdAt'
>;

export type SubmitDailyCheckInResponse = {
  dailyCheckIn: DailyCheckIn;
};

/** @deprecated Use SubmitDailyCheckInResponse. */
export type DailyCheckInResponse = SubmitDailyCheckInResponse;

export type GetTodayDailyCheckInResponse = {
  completedToday: boolean;
  dailyCheckIn: DailyCheckIn | null;
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

export type StartWorkoutRequest = {
  trainingPlanId: string;
  workoutDayIndex: number;
};

export type StartWorkoutResponse = {
  workoutSession: {
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
};

export type CompleteWorkoutResponse = StartWorkoutResponse;

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
