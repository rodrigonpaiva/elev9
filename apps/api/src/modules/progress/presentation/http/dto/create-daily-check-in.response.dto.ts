export class CreateDailyCheckInResponseDto {
  dailyCheckIn!: {
    id: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    localDate: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
  };
}
