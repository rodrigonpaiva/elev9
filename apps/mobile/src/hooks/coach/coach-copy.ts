import type { CoachDecision } from '@elev9/types';

export function getCoachGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export function getCoachFirstName(name?: string | null): string | null {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return null;
  }

  const firstName = trimmedName.split(/\s+/)[0]?.trim();

  return firstName && firstName.length > 0 ? firstName : null;
}

export function getCoachGreetingMessage(name?: string | null): string {
  const firstName = getCoachFirstName(name);

  return firstName
    ? `${getCoachGreeting()}, ${firstName}.`
    : `${getCoachGreeting()}.`;
}

export function normalizeCoachSentence(value: string): string {
  const trimmed = value.trim();

  if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
    return trimmed;
  }

  return `${trimmed}.`;
}

export function stripCoachMetricLanguage(value: string): string {
  return value
    .replace(/\b\d+(\.\d+)?%?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function limitCoachText(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 3).trim()}...`
    : value;
}

export function getCoachPriorityBenefit(
  priority: CoachDecision['priority'],
): string {
  switch (priority) {
    case 'recovery':
      return 'Better readiness tomorrow.';
    case 'nutrition':
      return 'More consistent energy today.';
    case 'training':
      return 'A stronger training signal.';
    case 'consistency':
      return 'Keeps your momentum intact.';
    case 'motivation':
    default:
      return 'A clearer next step.';
  }
}

export function getCoachPriorityGoalLabel(
  priority: CoachDecision['priority'],
): string {
  switch (priority) {
    case 'recovery':
      return 'Improve recovery';
    case 'nutrition':
      return 'Nutrition consistency';
    case 'training':
      return 'Training progress';
    case 'consistency':
      return 'Improve consistency';
    case 'motivation':
    default:
      return 'Personal progress';
  }
}
