import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateDailyCheckInRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  energyLevel!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  sleepQuality!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  muscleSoreness!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  motivationLevel!: number;
}
