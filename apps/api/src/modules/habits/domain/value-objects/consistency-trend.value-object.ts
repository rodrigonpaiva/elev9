import type { ConsistencyTrend } from '../habits.types';

export type ConsistencyTrendProps = {
  value: ConsistencyTrend;
};

export class ConsistencyTrendValueObject {
  readonly value: ConsistencyTrend;

  constructor(value: ConsistencyTrend) {
    this.value = value;
  }

  toJSON(): ConsistencyTrendProps {
    return {
      value: this.value,
    };
  }
}
