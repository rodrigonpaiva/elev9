import { IsIn, IsObject, IsOptional } from 'class-validator';

export class RecordEngagementEventRequestDto {
  @IsIn(['impression', 'opened', 'clicked', 'dismissed', 'completed'])
  type!: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
