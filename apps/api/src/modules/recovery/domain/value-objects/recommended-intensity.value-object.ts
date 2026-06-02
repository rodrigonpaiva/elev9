export type RecommendedIntensity = 'recovery' | 'light' | 'moderate' | 'hard';

export type RecommendedIntensityProps = {
  value: RecommendedIntensity;
};

export class RecommendedIntensityValueObject {
  readonly value: RecommendedIntensity;

  constructor(value: RecommendedIntensity) {
    this.value = value;
  }

  toJSON(): RecommendedIntensityProps {
    return {
      value: this.value,
    };
  }
}

