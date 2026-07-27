export type GetTodayDailyCheckInOutput = {
  completedToday: boolean;
  dailyCheckIn: {
    id: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    localDate: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};
