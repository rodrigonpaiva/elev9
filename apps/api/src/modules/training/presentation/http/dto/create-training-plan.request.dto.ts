import { IsString } from "class-validator";

export class CreateTrainingPlanRequestDto {
  @IsString()
  fitnessProfileId!: string;
}
