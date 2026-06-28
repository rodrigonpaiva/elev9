import type { CoachingStyle } from '../personalization.types';

export type CoachingStyleProps = {
  value: CoachingStyle;
};

export class CoachingStyleValueObject {
  readonly value: CoachingStyle;

  constructor(value: CoachingStyle) {
    this.value = value;
  }

  toJSON(): CoachingStyleProps {
    return {
      value: this.value,
    };
  }
}
