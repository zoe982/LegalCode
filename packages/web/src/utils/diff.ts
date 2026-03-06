export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Compute a line-based diff between two strings using LCS (Longest Common Subsequence).
 * Returns an array of DiffLine objects marking each line as added, removed, or unchanged.
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  if (oldText === '' && newText === '') return [];

  const oldLines = oldText === '' ? [] : oldText.split('\n');
  const newLines = newText === '' ? [] : newText.split('\n');

  // Build LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const prevRow = dp[i - 1];
      const currRow = dp[i];
      /* v8 ignore next 2 -- safety guard for TS strict index access */
      if (!prevRow || !currRow) continue;
      if (oldLines[i - 1] === newLines[j - 1]) {
        /* v8 ignore next -- nullish coalesce safety for strict index */
        currRow[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        /* v8 ignore next -- nullish coalesce safety for strict index */
        currRow[j] = Math.max(prevRow[j] ?? 0, currRow[j - 1] ?? 0);
      }
    }
  }

  // Backtrack to build diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const currRow = dp[i];
    const prevRow = dp[i - 1];

    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      /* v8 ignore next -- nullish coalesce safety for strict index */
      result.push({ type: 'unchanged', text: oldLines[i - 1] ?? '' });
      i--;
      j--;
      /* v8 ignore next -- nullish coalesce safety for strict index */
    } else if (j > 0 && (i === 0 || (currRow?.[j - 1] ?? 0) >= (prevRow?.[j] ?? 0))) {
      /* v8 ignore next -- nullish coalesce safety for strict index */
      result.push({ type: 'added', text: newLines[j - 1] ?? '' });
      j--;
    } else {
      /* v8 ignore next -- nullish coalesce safety for strict index */
      result.push({ type: 'removed', text: oldLines[i - 1] ?? '' });
      i--;
    }
  }

  return result.reverse();
}
