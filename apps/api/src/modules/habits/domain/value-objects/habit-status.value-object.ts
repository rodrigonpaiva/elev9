import type { HabitStatus } from '../habits.types';

export type HabitStatusProps = {
  value: HabitStatus;
};

export class HabitStatusValueObject {
  readonly value: HabitStatus;

  constructor(value: HabitStatus) {
    this.value = value;
  }

  toJSON(): HabitStatusProps {
    return {
      value: this.value,
    };
  }
}
