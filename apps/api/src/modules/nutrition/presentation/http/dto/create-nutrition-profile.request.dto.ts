import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNutritionProfileRequestDto {
  @IsIn(['fat_loss', 'maintenance', 'muscle_gain'])
  goal!: 'fat_loss' | 'maintenance' | 'muscle_gain';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  mealsPerDay!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(100, { each: true })
  dietaryRestrictions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(100, { each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(100, { each: true })
  dislikedFoods?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  @MaxLength(100, { each: true })
  preferredFoods?: string[];
}
