const SUGGESTION_COLORS = [
  '#E63946', // Red
  '#457B9D', // Steel blue
  '#2A9D8F', // Teal
  '#E9C46A', // Gold
  '#6A4C93', // Purple
  '#D4A574', // Tan
  '#4A90D9', // Blue
  '#7CB342', // Green
] as const;

const FALLBACK_COLOR = '#6B6D82';

const colorCache = new Map<string, string>();

/**
 * Returns a deterministic color for a given email address.
 * Same email always gets the same color.
 */
export function getSuggestionColor(email: string | undefined | null): string {
  if (!email) return FALLBACK_COLOR;

  const cached = colorCache.get(email);
  if (cached) return cached;

  // Simple hash
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }

  const index = Math.abs(hash) % SUGGESTION_COLORS.length;
  const color = SUGGESTION_COLORS[index] /* v8 ignore next */ ?? FALLBACK_COLOR;
  colorCache.set(email, color);
  return color;
}
