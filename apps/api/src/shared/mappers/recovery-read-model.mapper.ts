import type {
  RecoveryInfluenceProps,
  RecoverySnapshot,
  RecoveryTrend,
  RecommendedIntensity,
} from '../../modules/recovery/domain/entities/recovery-snapshot.entity';

export type RecoveryReadModelPayload = {
  readinessScore: number;
  fatigueScore: number;
  recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
  recommendedIntensity: 'low' | 'medium' | 'normal';
  recoveryInfluences?: RecoveryInfluenceProps[];
};

type RecoveryReadModelSource = Pick<
  RecoverySnapshot,
  'readinessScore' | 'fatigueScore' | 'influences'
> & {
  recoveryTrend: RecoveryTrend | { value: RecoveryTrend };
  recommendedIntensity: RecommendedIntensity | { value: RecommendedIntensity };
};

export class RecoveryReadModelMapper {
  static toDashboardPayload(
    recoverySnapshot: RecoveryReadModelSource | null | undefined,
  ): RecoveryReadModelPayload | undefined {
    if (!recoverySnapshot) {
      return undefined;
    }

    return {
      readinessScore: recoverySnapshot.readinessScore,
      fatigueScore: recoverySnapshot.fatigueScore,
      recoveryTrend: this.mapRecoveryTrend(recoverySnapshot.recoveryTrend),
      recommendedIntensity: this.mapRecommendedIntensity(
        recoverySnapshot.recommendedIntensity,
      ),
      recoveryInfluences: recoverySnapshot.influences.map((influence) =>
        this.toInfluencePayload(influence),
      ),
    };
  }

  private static mapRecoveryTrend(
    recoveryTrend: RecoveryTrend | { value: RecoveryTrend },
  ): 'improving' | 'stable' | 'needs_recovery' {
    const value = this.resolveValue(recoveryTrend);

    return value === 'declining' ? 'needs_recovery' : value;
  }

  private static mapRecommendedIntensity(
    recommendedIntensity:
      | RecommendedIntensity
      | { value: RecommendedIntensity },
  ): 'low' | 'medium' | 'normal' {
    switch (this.resolveValue(recommendedIntensity)) {
      case 'recovery':
      case 'light':
        return 'low';
      case 'moderate':
        return 'medium';
      case 'hard':
      default:
        return 'normal';
    }
  }

  private static resolveValue<T extends string>(input: T | { value: T }): T {
    if (typeof input === 'object' && input !== null && 'value' in input) {
      return input.value;
    }

    return input;
  }

  private static toInfluencePayload(
    influence:
      | RecoveryInfluenceProps
      | { toJSON: () => RecoveryInfluenceProps },
  ): RecoveryInfluenceProps {
    return typeof influence === 'object' &&
      influence !== null &&
      'toJSON' in influence
      ? influence.toJSON()
      : influence;
  }
}
