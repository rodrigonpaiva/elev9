import type { ResponsivenessLevel } from '../personalization.types';

export type ResponsivenessLevelProps = {
  value: ResponsivenessLevel;
};

export class ResponsivenessLevelValueObject {
  readonly value: ResponsivenessLevel;

  constructor(value: ResponsivenessLevel) {
    this.value = value;
  }

  toJSON(): ResponsivenessLevelProps {
    return {
      value: this.value,
    };
  }
}
