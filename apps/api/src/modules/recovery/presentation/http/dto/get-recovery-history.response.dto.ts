import { RecoverySnapshotResponse } from './recovery-response.type';

export class GetRecoveryHistoryResponseDto {
  recoverySnapshots!: RecoverySnapshotResponse[];
}
