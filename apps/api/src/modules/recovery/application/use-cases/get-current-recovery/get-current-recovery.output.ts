import { RecoverySnapshot } from '../../../domain/entities/recovery-snapshot.entity';

export type GetCurrentRecoveryOutput = {
  recoverySnapshot: RecoverySnapshot;
};
