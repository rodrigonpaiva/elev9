import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

class MacroTargetsRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  calories!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proteinGrams!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  carbsGrams!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fatGrams!: number;
}

export class LogMealRequestDto {
  @IsString()
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
