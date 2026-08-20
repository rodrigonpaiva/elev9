import { IsMongoId } from 'class-validator';

export class CompleteWorkoutParamsDto {
  @IsMongoId()
  sessionId!: string;
}
