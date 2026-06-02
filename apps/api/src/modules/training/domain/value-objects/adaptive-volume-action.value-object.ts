import type { AdaptiveVolumeAction } from './adaptive-recommendation-type.value-object';

export class AdaptiveVolumeActionValueObject {
  readonly value: AdaptiveVolumeAction;

  constructor(value: AdaptiveVolumeAction) {
    this.value = value;
  }

  toJSON(): { value: AdaptiveVolumeAction } {
    return {
      value: this.value,
    };
  }
}

