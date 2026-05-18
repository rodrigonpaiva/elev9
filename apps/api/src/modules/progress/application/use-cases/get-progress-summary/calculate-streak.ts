import { WorkoutLog } from '../../../domain/entities/workout-log.entity';

export function calculateStreak(workoutLogs: WorkoutLog[]): number {
  if (workoutLogs.length === 0) {
    return 0;
  }

  const uniqueDates = Array.from(
    new Set(workoutLogs.map((workoutLog) => workoutLog.date)),
  ).sort((left, right) => right.localeCompare(left));

  let streak = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previousDate = uniqueDates[index - 1];
    const currentDate = uniqueDates[index];

    if (differenceInUtcDays(previousDate, currentDate) !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function differenceInUtcDays(laterDate: string, earlierDate: string): number {
  const later = new Date(`${laterDate}T00:00:00.000Z`);
  const earlier = new Date(`${earlierDate}T00:00:00.000Z`);

  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000);
}
