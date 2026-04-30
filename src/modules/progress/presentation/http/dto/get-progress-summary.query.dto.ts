import { IsIn, IsOptional } from "class-validator";

export class GetProgressSummaryQueryDto {
  @IsOptional()
  @IsIn(["week", "month"])
  period?: "week" | "month";
}
