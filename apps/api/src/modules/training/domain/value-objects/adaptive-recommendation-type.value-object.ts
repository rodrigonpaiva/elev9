export type AdaptiveRecommendationType =
  | 'increase_intensity'
  | 'decrease_intensity'
  | 'increase_volume'
  | 'decrease_volume'
  | 'recovery_workout'
  | 'rest_day'
  | 'reschedule_workout'
  | 'maintain';

export type AdaptiveRecommendedIntensity =
  | 'recovery'
  | 'light'
  | 'moderate'
  | 'hard';

export type AdaptiveVolumeAction = 'increase' | 'maintain' | 'decrease';

export class AdaptiveRecommendationTypeValueObject {
  readonly value: AdaptiveRecommendationType;

  constructor(value: AdaptiveRecommendationType) {
    this.value = value;
  }

  toJSON(): { value: AdaptiveRecommendationType } {
    return {
      value: this.value,
    };
  }
}
