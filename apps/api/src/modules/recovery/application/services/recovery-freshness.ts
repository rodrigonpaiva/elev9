import type { DailyCheckIn } from '../../../progress/domain/entities/daily-check-in.entity';
import type { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import type { WorkoutLog } from '../../../progress/domain/entities/workout-log.entity';

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

export function isRecoverySnapshotStaleForWorkout(
  snapshot: RecoverySnapshot,
  workoutLog: WorkoutLog | null,
): boolean {
  if (!workoutLog) return false;

  const generatedAt = snapshot.sourceContext?.generatedAt;
  const snapshotTimestamp = generatedAt
    ? new Date(generatedAt).getTime()
    : snapshot.createdAt.getTime();

  return (
    !Number.isFinite(snapshotTimestamp) ||
    workoutLog.updatedAt.getTime() > snapshotTimestamp
  );
}
