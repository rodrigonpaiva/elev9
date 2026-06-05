import type { NotificationType } from '../notifications.types';

export type NotificationTypeProps = {
  value: NotificationType;
};

export class NotificationTypeValueObject {
  readonly value: NotificationType;

  constructor(value: NotificationType) {
    this.value = value;
  }

  toJSON(): NotificationTypeProps {
    return {
      value: this.value,
    };
  }
}
