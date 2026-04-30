export interface Clock {
  now(): Date;
  todayUtcDateString(): string;
}

export const CLOCK = Symbol("CLOCK");
