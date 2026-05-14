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
        period: "week" | "month";
        workoutsCompleted: number;
        totalDurationMinutes: number;
        averageDurationMinutes: number;
        lastWorkoutDate: string | null;
        currentStreak: number;
    };
};
