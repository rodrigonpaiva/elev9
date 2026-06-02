import { Injectable } from '@nestjs/common';

@Injectable()
export class AdaptiveTrainingDateService {
  todayUtcDateString(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
  }
}
