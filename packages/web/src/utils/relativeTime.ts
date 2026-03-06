export function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHour < 24) return `${String(diffHour)}h ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 30) return `${String(diffDay)}d ago`;
  return date.toLocaleDateString();
}
