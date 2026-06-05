import type { NotificationFatigueLevel } from '../notifications.types';

export type NotificationFatigueLevelProps = {
  value: NotificationFatigueLevel;
};

export class NotificationFatigueLevelValueObject {
  readonly value: NotificationFatigueLevel;

  constructor(value: NotificationFatigueLevel) {
    this.value = value;
  }

  toJSON(): NotificationFatigueLevelProps {
    return {
      value: this.value,
    };
  }
}
