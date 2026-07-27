import { DailyCheckIn } from '../../../progress/domain/entities/daily-check-in.entity';
import { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import { isRecoverySnapshotStaleForCheckIn } from './recovery-freshness';

describe('recovery freshness', () => {
  const checkIn = new DailyCheckIn({
    id: 'check-in-1',
    userProfileId: 'profile-1',
    localDate: '2026-07-27',
    timezone: 'UTC',
    energyLevel: 4,
    sleepQuality: 4,
    muscleSoreness: 2,
    motivationLevel: 3,
    createdAt: new Date('2026-07-27T08:00:00.000Z'),
    updatedAt: new Date('2026-07-27T10:00:00.000Z'),
  });

  it('rejects a snapshot generated before the latest check-in update', () => {
    expect(
      isRecoverySnapshotStaleForCheckIn(
        buildSnapshot('2026-07-27T09:00:00.000Z'),
        checkIn,
      ),
    ).toBe(true);
  });

  it('accepts a snapshot generated after the latest check-in update', () => {
    expect(
      isRecoverySnapshotStaleForCheckIn(
        buildSnapshot('2026-07-27T11:00:00.000Z'),
        checkIn,
      ),
    ).toBe(false);
  });

  it('does not reject a snapshot when no check-in exists', () => {
    expect(
      isRecoverySnapshotStaleForCheckIn(
        buildSnapshot('2026-07-27T09:00:00.000Z'),
        null,
      ),
    ).toBe(false);
  });
});

function buildSnapshot(generatedAt: string): RecoverySnapshot {
  return new RecoverySnapshot({
    userProfileId: 'profile-1',
    date: '2026-07-27',
    readinessScore: 70,
    fatigueScore: 30,
    recoveryTrend: 'stable',
    recommendedIntensity: 'moderate',
    influences: [],
    formulaVersion: 'recovery-deterministic-v1',
    sourceContext: {
      formulaVersion: 'recovery-deterministic-v1',
      generatedAt,
    },
    createdAt: new Date(generatedAt),
  });
}
