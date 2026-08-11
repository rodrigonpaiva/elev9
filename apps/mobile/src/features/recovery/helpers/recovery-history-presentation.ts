import type { RecoveryExperienceHistoryItem } from '@elev9/types';

export function formatRecoveryLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return localDate;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function historyPointLabel(item: RecoveryExperienceHistoryItem): string {
  return `${formatRecoveryLocalDate(item.localDate)}, score ${item.score}`;
}

export function availableHistoryPointCount(
  history: RecoveryExperienceHistoryItem[],
): number {
  return history.filter((item) => item.availability === 'available').length;
}
