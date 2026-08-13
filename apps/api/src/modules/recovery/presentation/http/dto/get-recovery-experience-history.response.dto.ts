import type { RecoveryHistoryReadModel } from '../../../application/read-models/recovery-read-model.types';

export class GetRecoveryExperienceHistoryResponseDto implements RecoveryHistoryReadModel {
  range!: RecoveryHistoryReadModel['range'];
  items!: RecoveryHistoryReadModel['items'];
  trend!: RecoveryHistoryReadModel['trend'];
}
