import { Injectable } from '@nestjs/common';

import { Clock } from '../domain/services/clock.service';

@Injectable()
export class SystemClockService implements Clock {
  now(): Date {
    return new Date();
  }

  todayUtcDateString(): string {
    return this.now().toISOString().slice(0, 10);
  }
}
