import type { EngagementProfile } from '../personalization.types';

export type EngagementProfileProps = {
  value: EngagementProfile;
};

export class EngagementProfileValueObject {
  readonly value: EngagementProfile;

  constructor(value: EngagementProfile) {
    this.value = value;
  }

  toJSON(): EngagementProfileProps {
    return {
      value: this.value,
    };
  }
}
