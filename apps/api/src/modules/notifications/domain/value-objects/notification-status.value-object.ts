import type { NotificationStatus } from '../notifications.types';

export type NotificationStatusProps = {
  value: NotificationStatus;
};

export class NotificationStatusValueObject {
  readonly value: NotificationStatus;

  constructor(value: NotificationStatus) {
    this.value = value;
  }

  toJSON(): NotificationStatusProps {
    return {
      value: this.value,
    };
  }
}
