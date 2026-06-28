import type { NotificationChannel } from '../notifications.types';

export type NotificationChannelProps = {
  value: NotificationChannel;
};

export class NotificationChannelValueObject {
  readonly value: NotificationChannel;

  constructor(value: NotificationChannel) {
    this.value = value;
  }

  toJSON(): NotificationChannelProps {
    return {
      value: this.value,
    };
  }
}
