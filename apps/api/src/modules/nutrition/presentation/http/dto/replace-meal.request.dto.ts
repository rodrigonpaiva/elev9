import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReplaceMealRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
