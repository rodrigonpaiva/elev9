import type { AdaptiveTrainingRecommendation } from '../../modules/training/domain/entities/adaptive-training-recommendation.entity';
import type { AdaptiveTrainingInfluenceProps } from '../../modules/training/domain/value-objects/adaptive-training-influence.value-object';

export type AdaptiveTrainingReadModelPayload = {
  recommendationType:
    | 'increase_intensity'
    | 'decrease_intensity'
    | 'increase_volume'
    | 'decrease_volume'
    | 'recovery_workout'
    | 'rest_day'
    | 'reschedule_workout'
    | 'maintain';
  recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
  volumeAction: 'increase' | 'maintain' | 'decrease';
  reasoning: string;
  influences: AdaptiveTrainingInfluenceProps[];
};

type AdaptiveTrainingInfluenceSource =
  | AdaptiveTrainingInfluenceProps
  | { toJSON: () => AdaptiveTrainingInfluenceProps };

type AdaptiveTrainingReadModelSource = {
  recommendationType: AdaptiveTrainingRecommendation['recommendationType'];
  recommendedIntensity: AdaptiveTrainingRecommendation['recommendedIntensity'];
  volumeAction: AdaptiveTrainingRecommendation['volumeAction'];
  reasoning: string;
  influences: AdaptiveTrainingInfluenceSource[];
};

export class AdaptiveTrainingReadModelMapper {
  static toDashboardPayload(
    recommendation: AdaptiveTrainingReadModelSource | null | undefined,
  ): AdaptiveTrainingReadModelPayload | undefined {
    if (!recommendation) {
      return undefined;
    }

    return {
      recommendationType: recommendation.recommendationType,
      recommendedIntensity: recommendation.recommendedIntensity,
      volumeAction: recommendation.volumeAction,
      reasoning: recommendation.reasoning,
      influences: recommendation.influences.map((influence) =>
        this.toInfluencePayload(influence),
      ),
    };
  }

  private static toInfluencePayload(
    influence: AdaptiveTrainingInfluenceSource,
  ): AdaptiveTrainingInfluenceProps {
    return typeof influence === 'object' &&
      influence !== null &&
      'toJSON' in influence
      ? influence.toJSON()
      : influence;
  }
}
