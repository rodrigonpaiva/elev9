import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class MacroTargetsRequestDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(100000)
  calories!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(10000)
  proteinGrams!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(10000)
  carbsGrams!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(10000)
  fatGrams!: number;
}

export class LogMealRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  mealId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsIn(['consumed', 'partial', 'skipped'])
  status!: 'consumed' | 'partial' | 'skipped';

  @IsOptional()
  @ValidateNested()
  @Type(() => MacroTargetsRequestDto)
  actualMacros?: MacroTargetsRequestDto;
}
