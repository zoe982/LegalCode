export const AVATAR_COLORS = ['#8027FF', '#1976d2', '#2e7d32', '#d32f2f', '#ed6c02', '#9c27b0'];

export function getAvatarColor(index: number): string {
  /* v8 ignore next -- modulo guarantees valid index; ?? satisfies noUncheckedIndexedAccess */
  return AVATAR_COLORS[index % AVATAR_COLORS.length] ?? '#8027FF';
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  if (diffHr < 24) return `${String(diffHr)}h ago`;
  if (diffDay < 30) return `${String(diffDay)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
