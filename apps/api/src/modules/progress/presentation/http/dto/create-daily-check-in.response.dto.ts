export class CreateDailyCheckInResponseDto {
  dailyCheckIn!: {
    id: string;
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
    createdAt: string;
  };
}
