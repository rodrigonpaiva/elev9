import type { DailyCheckIn } from '../../../progress/domain/entities/daily-check-in.entity';
import type { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';

export function isRecoverySnapshotStaleForCheckIn(
  snapshot: RecoverySnapshot,
  checkIn: DailyCheckIn | null,
): boolean {
  if (!checkIn) {
    return false;
  }

  const generatedAt = snapshot.sourceContext?.generatedAt;
  const snapshotTimestamp = generatedAt
    ? new Date(generatedAt).getTime()
    : snapshot.createdAt.getTime();

  if (!Number.isFinite(snapshotTimestamp)) {
    return true;
  }

  return checkIn.updatedAt.getTime() > snapshotTimestamp;
}
