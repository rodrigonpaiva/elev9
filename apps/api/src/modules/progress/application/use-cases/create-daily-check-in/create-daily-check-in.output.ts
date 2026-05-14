export type CreateDailyCheckInOutput = {
  dailyCheckIn: {
    id: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    createdAt: Date;
  };
};
