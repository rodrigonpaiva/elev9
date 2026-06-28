import type { PersonalizationTrend } from '../personalization.types';

export type PersonalizationTrendProps = {
  value: PersonalizationTrend;
};

export class PersonalizationTrendValueObject {
  readonly value: PersonalizationTrend;

  constructor(value: PersonalizationTrend) {
    this.value = value;
  }

  toJSON(): PersonalizationTrendProps {
    return {
      value: this.value,
    };
  }
}
