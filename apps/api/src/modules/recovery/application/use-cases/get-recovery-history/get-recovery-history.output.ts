import { RecoverySnapshot } from '../../../domain/entities/recovery-snapshot.entity';

export type GetRecoveryHistoryOutput = {
  recoverySnapshots: RecoverySnapshot[];
};
