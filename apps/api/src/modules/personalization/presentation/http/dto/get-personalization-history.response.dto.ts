import type { PersonalizationSnapshotResponse } from './personalization-snapshot-response.type';

export class GetPersonalizationHistoryResponseDto {
  personalizationSnapshots!: PersonalizationSnapshotResponse[];
  limit!: number;
}
