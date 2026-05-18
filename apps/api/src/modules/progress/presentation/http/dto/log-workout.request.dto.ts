import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class CompletedExerciseDto {
  @IsString()
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  setsDone!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
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
  @IsString()
  trainingPlanId!: string;

  @Type(() => Number)
  @IsInt()
  workoutDayIndex!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompletedExerciseDto)
  completedExercises!: CompletedExerciseDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkoutFeedbackDto)
  feedback?: WorkoutFeedbackDto;
}
