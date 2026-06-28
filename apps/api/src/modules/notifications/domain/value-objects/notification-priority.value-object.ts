import type { NotificationPriority } from '../notifications.types';

export type NotificationPriorityProps = {
  value: NotificationPriority;
};

export class NotificationPriorityValueObject {
  readonly value: NotificationPriority;

  constructor(value: NotificationPriority) {
    this.value = value;
  }

  toJSON(): NotificationPriorityProps {
    return {
      value: this.value,
    };
  }
}
