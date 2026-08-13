import { RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import { RecoveryReadModelMapper } from './recovery-read-model.mapper';

describe('RecoveryReadModelMapper', () => {
  const mapper = new RecoveryReadModelMapper();

  it('maps a current snapshot without exposing internal fields', () => {
    const result = mapper.mapCurrent(
      buildSnapshot({
        recommendedIntensity: 'hard',
        sourceContext: {
          formulaVersion: 'recovery-deterministic-v1',
          generatedAt: '2026-07-28T10:00:00.000Z',
          recentCheckInsCount: 1,
          energyLevel: 5,
          sleepQuality: 4,
          muscleSoreness: 2,
          trainingPlanId: 'internal-plan',
        },
      }),
    );

    expect(result.availability).toBe('available');
    expect(result.recovery).toMatchObject({
      score: 84,
      category: 'high',
      freshness: 'current',
    });
    expect(result.recovery?.breakdown).toEqual([
      expect.objectContaining({ key: 'energy', impact: 'positive' }),
      expect.objectContaining({ key: 'sleep', impact: 'positive' }),
      expect.objectContaining({ key: 'muscle_soreness', impact: 'positive' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('internal-plan');
    expect(JSON.stringify(result)).not.toContain('energyLevel');
  });

  it('does not create a neutral product score when no check-in exists', () => {
    const result = mapper.mapCurrent(
      buildSnapshot({
        sourceContext: {
          formulaVersion: 'recovery-deterministic-v1',
          generatedAt: '2026-07-28T10:00:00.000Z',
          recentCheckInsCount: 0,
        },
      }),
    );

    expect(result).toEqual({
      availability: 'insufficient_data',
      recovery: null,
    });
  });

  it('marks snapshots without source metadata as legacy', () => {
    const result = mapper.mapCurrent(buildSnapshot({ sourceContext: {} }));

    expect(result.recovery?.freshness).toBe('legacy');
    expect(result.recovery?.insight.action).toBe('try_again_later');
  });

  function buildSnapshot(
    overrides: Partial<ConstructorParameters<typeof RecoverySnapshot>[0]> = {},
  ): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile-internal',
      date: '2026-07-28',
      readinessScore: 84,
      fatigueScore: 20,
      recoveryTrend: 'improving',
      recommendedIntensity: 'moderate',
      influences: [],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {},
      createdAt: new Date('2026-07-28T10:00:00.000Z'),
      ...overrides,
    });
  }
});
