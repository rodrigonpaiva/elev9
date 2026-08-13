import type { RecoveryCurrentReadModel } from '../../../application/read-models/recovery-read-model.types';

export class GetRecoveryExperienceCurrentResponseDto implements RecoveryCurrentReadModel {
  availability!: RecoveryCurrentReadModel['availability'];
  recovery!: RecoveryCurrentReadModel['recovery'];
}
