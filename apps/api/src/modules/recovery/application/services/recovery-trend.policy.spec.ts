import { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import { RecoveryTrendPolicy } from './recovery-trend.policy';

describe('RecoveryTrendPolicy', () => {
  const policy = new RecoveryTrendPolicy();

  it('returns insufficient data with fewer than two valid snapshots', () => {
    expect(policy.calculate([buildSnapshot(70)])).toEqual({
      direction: 'insufficient_data',
      comparedDays: 1,
    });
  });

  it.each([
    ['improving', [60, 70, 80]],
    ['declining', [80, 70, 60]],
    ['stable', [70, 72, 71]],
  ] as const)('classifies %s deterministically', (direction, scores) => {
    expect(
      policy.calculate(
        scores.map((score, index) =>
          buildSnapshot(score, `2026-07-${String(index + 1).padStart(2, '0')}`),
        ),
      ),
    ).toEqual({ direction, comparedDays: 3 });
  });

  it('ignores legacy snapshots', () => {
    expect(
      policy.calculate([
        buildSnapshot(20, '2026-07-01', false),
        buildSnapshot(80, '2026-07-02'),
      ]),
    ).toEqual({ direction: 'insufficient_data', comparedDays: 1 });
  });

  function buildSnapshot(
    score: number,
    date = '2026-07-01',
    current = true,
  ): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile-internal',
      date,
      readinessScore: score,
      fatigueScore: 30,
      recoveryTrend: 'stable',
      recommendedIntensity: 'moderate',
      influences: [],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: current
        ? {
            formulaVersion: 'recovery-deterministic-v1',
            generatedAt: `${date}T10:00:00.000Z`,
          }
        : {},
      createdAt: new Date(`${date}T10:00:00.000Z`),
    });
  }
});
