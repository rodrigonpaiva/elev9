import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ReplacementExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  sets!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  reps!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  restSeconds!: number;
}

export class ReplaceWorkoutExerciseRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  exerciseIndex!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentExerciseName!: string;

  @ValidateNested()
  @Type(() => ReplacementExerciseDto)
  replacementExercise!: ReplacementExerciseDto;

  @IsIn([
    'no_equipment',
    'too_difficult',
    'too_easy',
    'discomfort',
    'preference',
  ])
  reason!:
    | 'no_equipment'
    | 'too_difficult'
    | 'too_easy'
    | 'discomfort'
    | 'preference';

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
}
