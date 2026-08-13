type CoachRelativeTimeStyle = 'long' | 'compact' | 'recent';

type CoachRelativeTimeOptions = {
  style?: CoachRelativeTimeStyle;
};

export function formatCoachRelativeTime(
  value: string,
  options: CoachRelativeTimeOptions = {},
): string {
  const style = options.style ?? 'long';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return style === 'recent' ? 'Recent' : 'today';
  }

  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (style === 'recent') {
    if (minutes < 60) {
      return 'Today';
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return 'Today';
    }

    const days = Math.round(hours / 24);

    if (days === 1) {
      return 'Yesterday';
    }

    if (days < 7) {
      return `${days} days ago`;
    }

    return 'Recent';
  }

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return style === 'compact'
      ? `${minutes} min ago`
      : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return style === 'compact'
      ? `${hours} hr ago`
      : `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  return 'today';
}
