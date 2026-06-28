import { AdaptiveTrainingReadModelMapper } from './adaptive-training-read-model.mapper';

describe('AdaptiveTrainingReadModelMapper', () => {
  it('maps an adaptive training recommendation to a safe dashboard payload without sourceContext', () => {
    const result = AdaptiveTrainingReadModelMapper.toDashboardPayload({
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
      reasoning: 'Readiness is high and fatigue is low.',
      influences: [
        {
          toJSON: () => ({
            code: 'HIGH_READINESS',
            label: 'High readiness',
            impact: 'positive',
            weight: 1,
            value: 82,
          }),
        },
      ],
      sourceContext: {
        prompt: 'hidden',
      },
    } as never);

    expect(result).toEqual({
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
      reasoning: 'Readiness is high and fatigue is low.',
      influences: [
        {
          code: 'HIGH_READINESS',
          label: 'High readiness',
          impact: 'positive',
          weight: 1,
          value: 82,
        },
      ],
    });
    expect(result).not.toHaveProperty('sourceContext');
  });
});
