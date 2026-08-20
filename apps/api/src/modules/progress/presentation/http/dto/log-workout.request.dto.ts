import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CompletedExerciseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  setsDone!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  repsDone!: number;
}

class WorkoutFeedbackDto {
  @IsIn(['easy', 'medium', 'hard'])
  difficulty!: 'easy' | 'medium' | 'hard';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class LogWorkoutRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  trainingPlanId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  workoutDayIndex!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CompletedExerciseDto)
  completedExercises!: CompletedExerciseDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkoutFeedbackDto)
  feedback?: WorkoutFeedbackDto;
}
