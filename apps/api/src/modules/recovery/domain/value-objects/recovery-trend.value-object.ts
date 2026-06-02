export type RecoveryTrend = 'improving' | 'stable' | 'declining';

export type RecoveryTrendProps = {
  value: RecoveryTrend;
};

export class RecoveryTrendValueObject {
  readonly value: RecoveryTrend;

  constructor(value: RecoveryTrend) {
    this.value = value;
  }

  toJSON(): RecoveryTrendProps {
    return {
      value: this.value,
    };
  }
}

