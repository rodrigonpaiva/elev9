import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class TrainingAvailabilityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek!: number;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(180)
  minutesPerSession!: number;
}

class FitnessLimitationDto {
  @IsString()
  @MaxLength(80)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @IsIn(['low', 'medium', 'high'])
  severity!: 'low' | 'medium' | 'high';
}

export class CreateFitnessProfileRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(30)
  @Max(300)
  weightKg!: number;

  @IsIn(['lose_weight', 'gain_muscle', 'maintain'])
  goal!: 'lose_weight' | 'gain_muscle' | 'maintain';

  @IsIn(['low', 'medium', 'high'])
  activityLevel!: 'low' | 'medium' | 'high';

  @ValidateNested()
  @Type(() => TrainingAvailabilityDto)
  trainingAvailability!: TrainingAvailabilityDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FitnessLimitationDto)
  limitations?: FitnessLimitationDto[];
}
