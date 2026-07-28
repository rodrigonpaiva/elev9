import type { RecoverySourceContext } from '../../../../shared/source-context';
import type {
  RecoveryFactorImpact,
  RecoveryFactorReadModel,
} from '../read-models/recovery-read-model.types';

export class RecoveryFactorBreakdownPolicy {
  build(sourceContext: RecoverySourceContext): RecoveryFactorReadModel[] {
    return [
      this.buildFactor({
        key: 'energy',
        value: sourceContext.energyLevel,
        unavailable: !this.hasCheckIn(sourceContext),
        negativeAtOrBelow: 2,
        positiveAbove: 3,
        labelKey: 'recovery.factors.energy.label',
        explanationKey: 'recovery.factors.energy.explanation',
      }),
      this.buildFactor({
        key: 'sleep',
        value: sourceContext.sleepQuality,
        unavailable: !this.hasCheckIn(sourceContext),
        negativeAtOrBelow: 2,
        positiveAbove: 3,
        labelKey: 'recovery.factors.sleep.label',
        explanationKey: 'recovery.factors.sleep.explanation',
      }),
      this.buildFactor({
        key: 'muscle_soreness',
        value: sourceContext.muscleSoreness,
        unavailable: !this.hasCheckIn(sourceContext),
        negativeAtOrBelow: 2,
        positiveAbove: 3,
        invert: true,
        labelKey: 'recovery.factors.muscle_soreness.label',
        explanationKey: 'recovery.factors.muscle_soreness.explanation',
      }),
    ];
  }

  private buildFactor(input: {
    key: 'energy' | 'sleep' | 'muscle_soreness';
    value?: number;
    unavailable: boolean;
    negativeAtOrBelow: number;
    positiveAbove: number;
    invert?: boolean;
    labelKey: string;
    explanationKey: string;
  }): RecoveryFactorReadModel {
    const impact: RecoveryFactorImpact = input.unavailable
      ? 'unavailable'
      : input.invert
        ? this.invertedImpact(input.value)
        : this.directImpact(input.value, input.negativeAtOrBelow, input.positiveAbove);

    return {
      key: input.key,
      impact,
      labelKey: input.labelKey,
      explanationKey: input.explanationKey,
    };
  }

  private directImpact(
    value: number | undefined,
    negativeAtOrBelow: number,
    positiveAbove: number,
  ): RecoveryFactorImpact {
    if (typeof value !== 'number') return 'unavailable';
    if (value <= negativeAtOrBelow) return 'negative';
    if (value > positiveAbove) return 'positive';
    return 'neutral';
  }

  private invertedImpact(value: number | undefined): RecoveryFactorImpact {
    if (typeof value !== 'number') return 'unavailable';
    if (value >= 4) return 'negative';
    if (value <= 2) return 'positive';
    return 'neutral';
  }

  private hasCheckIn(sourceContext: RecoverySourceContext): boolean {
    return (sourceContext.recentCheckInsCount ?? 0) > 0;
  }
}
