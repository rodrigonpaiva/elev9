import { Injectable } from '@nestjs/common';

@Injectable()
export class CoachDecisionDateService {
  todayUtcDateString(now = new Date()): string {
    return now.toISOString().slice(0, 10);
  }
}
