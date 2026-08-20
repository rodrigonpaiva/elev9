import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateTrainingPlanRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  fitnessProfileId!: string;
}
