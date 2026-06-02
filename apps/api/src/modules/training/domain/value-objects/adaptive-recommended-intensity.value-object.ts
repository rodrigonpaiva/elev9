import type { AdaptiveRecommendedIntensity } from './adaptive-recommendation-type.value-object';

export class AdaptiveRecommendedIntensityValueObject {
  readonly value: AdaptiveRecommendedIntensity;

  constructor(value: AdaptiveRecommendedIntensity) {
    this.value = value;
  }

  toJSON(): { value: AdaptiveRecommendedIntensity } {
    return {
      value: this.value,
    };
  }
}

