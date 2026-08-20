import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Min } from 'class-validator';

export class StartWorkoutRequestDto {
  @IsMongoId()
  trainingPlanId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  workoutDayIndex!: number;
}
