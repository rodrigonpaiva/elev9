import { RecoveryReadModelMapper } from './recovery-read-model.mapper';

describe('RecoveryReadModelMapper', () => {
  it('maps a recovery snapshot to a safe dashboard payload without sourceContext', () => {
    const result = RecoveryReadModelMapper.toDashboardPayload({
      readinessScore: 84,
      fatigueScore: 18,
      recoveryTrend: { value: 'declining' },
      recommendedIntensity: { value: 'hard' },
      influences: [
        {
          toJSON: () => ({
            code: 'LOW_SLEEP',
            label: 'Low sleep',
            impact: 'negative',
            weight: 0.8,
            value: 2,
          }),
        },
      ],
    } as never);

    expect(result).toEqual({
      readinessScore: 84,
      fatigueScore: 18,
      recoveryTrend: 'needs_recovery',
      recommendedIntensity: 'normal',
      recoveryInfluences: [
        {
          code: 'LOW_SLEEP',
          label: 'Low sleep',
          impact: 'negative',
          weight: 0.8,
          value: 2,
        },
      ],
    });
    expect(result).not.toHaveProperty('sourceContext');
  });
});
