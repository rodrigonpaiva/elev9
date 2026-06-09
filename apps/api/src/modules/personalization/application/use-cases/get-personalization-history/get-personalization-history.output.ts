import { PersonalizationSnapshot } from '../../../domain/entities/personalization-snapshot.entity';

export type GetPersonalizationHistoryOutput = {
  personalizationSnapshots: PersonalizationSnapshot[];
  limit: number;
};
