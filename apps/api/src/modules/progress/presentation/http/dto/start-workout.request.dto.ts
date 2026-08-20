import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

export class StartWorkoutRequestDto {
  @IsMongoId()
  trainingPlanId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  workoutDayIndex!: number;
}
