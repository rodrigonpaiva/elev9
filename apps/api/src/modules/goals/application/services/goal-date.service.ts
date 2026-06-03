export class GoalDateService {
  todayUtcDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  addDaysToDateString(dateString: string, days: number): string {
    const date = new Date(`${dateString}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
