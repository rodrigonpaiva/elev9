import type { BehavioralPatternType } from '../personalization.types';

export type BehavioralPatternTypeProps = {
  value: BehavioralPatternType;
};

export class BehavioralPatternTypeValueObject {
  readonly value: BehavioralPatternType;

  constructor(value: BehavioralPatternType) {
    this.value = value;
  }

  toJSON(): BehavioralPatternTypeProps {
    return {
      value: this.value,
    };
  }
}
