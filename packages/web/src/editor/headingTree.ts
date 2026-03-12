import type { Node } from '@milkdown/kit/prose/model';

export interface HeadingEntry {
  /** Heading depth 1-6, or 0 for title nodes */
  level: number;
  /** Raw text content of the heading node */
  text: string;
  /** ProseMirror position of the heading node */
  pos: number;
  /** Position of the end of the section (start of next same-or-higher heading, or doc end) */
  endPos: number;
  /** First ~50 chars of body text below the heading */
  bodyPreview: string;
  /**
   * Computed hierarchical legal number using alternating depth pattern.
   * H1→depth1 ("1"), H2/H3→depth2 ("1.1"), H4/H5→depth3 ("1.1.1"), H6→depth4 ("1.1.1.1").
   * Empty string for title entry.
   */
  number: string;
  /** True if this heading is the document title (node.type.name === 'title') */
  isTitle: boolean;
  /** True if any entry with a greater level follows before the next same-or-higher-level entry */
  hasChildren: boolean;
}

// ---------------------------------------------------------------------------
// Alternating depth map
// ---------------------------------------------------------------------------

/**
 * Maps HTML heading level (1-6) to a logical numbering depth (1-4).
 *
 * H1 and H2 each own a unique depth, while H3 shares depth 2 with H2,
 * H5 shares depth 3 with H4, and H6 occupies depth 4 alone.
 *
 * ```
 * Level: 1  2  3  4  5  6
 * Depth: 1  2  2  3  3  4
 * ```
 */
export const LEVEL_TO_DEPTH: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 3,
  6: 4,
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Raw entry before endPos / bodyPreview / hasChildren are resolved */
interface RawEntry {
  level: number;
  text: string;
  pos: number;
  /** start pos of the first non-heading node after this heading */
  bodyStartPos: number;
  number: string;
  isTitle: boolean;
}

/** Minimal shape we access on a doc-like object */
interface DocLike {
  nodeSize: number;
  forEach: (cb: (node: NodeLike, offset: number, index: number) => void) => void;
}

interface NodeLike {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent: string;
  nodeSize: number;
}

interface TopLevelNode {
  node: NodeLike;
  pos: number;
}

// ---------------------------------------------------------------------------
// Memoisation cache (WeakMap — keyed by doc identity, GC-friendly)
// ---------------------------------------------------------------------------

const cache = new WeakMap<object, HeadingEntry[]>();

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

/**
 * Walk a ProseMirror document and return an array of {@link HeadingEntry} objects
 * with computed hierarchical legal numbering using an alternating depth pattern.
 *
 * Heading levels are grouped in pairs that share the same numbering depth:
 * - H1 → depth 1 (e.g. "1", "2", "3")
 * - H2 and H3 → depth 2 (e.g. "1.1", "1.2", "1.3" — both advance the same counter)
 * - H4 and H5 → depth 3 (e.g. "1.3.1", "1.3.2", "1.3.3")
 * - H6 → depth 4 (e.g. "1.3.3.1")
 *
 * The function is pure and deterministic. Results are memoised by document
 * object identity so repeated calls with the same (immutable) doc are free.
 *
 * Title detection: a node with `type.name === 'title'` is treated as the document
 * title — it gets `isTitle: true`, `number: ''`, and `level: 0`. No level-shifting
 * is applied; all heading levels are used directly.
 */
export function extractHeadingTree(doc: Node): HeadingEntry[] {
  const docObj = doc as unknown as object;

  const cached = cache.get(docObj);
  if (cached !== undefined) {
    return cached;
  }

  const docLike = doc as unknown as DocLike;

  // ------------------------------------------------------------------
  // Pass 1: collect all top-level nodes with positions, in document order.
  // ------------------------------------------------------------------

  const topLevel: TopLevelNode[] = [];

  docLike.forEach((node, offset) => {
    topLevel.push({ node, pos: offset });
  });

  // ------------------------------------------------------------------
  // Pass 2: build raw entries with numbering
  // ------------------------------------------------------------------

  // 4 counters for the 4 logical depths (index 0 = depth 1, index 3 = depth 4)
  const counters: number[] = [0, 0, 0, 0];

  const rawEntries: RawEntry[] = [];

  for (const { node, pos } of topLevel) {
    // Handle title nodes
    if (node.type.name === 'title') {
      const bodyStartPos = pos + node.nodeSize;
      rawEntries.push({
        level: 0,
        text: node.textContent,
        pos,
        bodyStartPos,
        number: '',
        isTitle: true,
      });
      continue;
    }

    if (node.type.name !== 'heading') continue;

    const rawLevel = (node.attrs as { level?: unknown } | undefined)?.level;
    const level = typeof rawLevel === 'number' ? rawLevel : 0;
    if (level < 1 || level > 6) continue;

    // Increment this depth's counter and reset all deeper depth counters
    incrementCounters(counters, level);

    const number = buildNumber(counters, level);

    // bodyStartPos: the position immediately after this heading node
    const bodyStartPos = pos + node.nodeSize;

    rawEntries.push({ level, text: node.textContent, pos, bodyStartPos, number, isTitle: false });
  }

  // ------------------------------------------------------------------
  // Pass 3: resolve endPos and bodyPreview for each entry
  // ------------------------------------------------------------------

  const docEnd = docLike.nodeSize - 1;

  const entries: HeadingEntry[] = rawEntries.map((entry, idx) => {
    // Find the next heading at the same or higher (lower number) level.
    // Title nodes use level 0; any heading (level >= 1) is "deeper" than a title.
    let endPos = docEnd;
    for (let j = idx + 1; j < rawEntries.length; j++) {
      const next = rawEntries[j];
      if (next !== undefined && next.level <= entry.level) {
        endPos = next.pos;
        break;
      }
    }

    // Collect body text from top-level nodes between this heading end and section end
    const bodyText = topLevel
      .filter(({ node, pos }) => {
        if (node.type.name === 'heading' || node.type.name === 'title') return false;
        return pos >= entry.bodyStartPos && pos < endPos;
      })
      .map(({ node }) => node.textContent)
      .join(' ')
      .trim();

    const bodyPreview = bodyText.length > 50 ? bodyText.slice(0, 50) + '...' : bodyText;

    // hasChildren: true if any immediately-following entry has level > this entry's level
    // before we encounter an entry with level <= this entry's level
    let hasChildren = false;
    for (let j = idx + 1; j < rawEntries.length; j++) {
      const next = rawEntries[j];
      /* v8 ignore next */
      if (next === undefined) break;
      if (next.level <= entry.level) break;
      // next.level > entry.level → this is a child
      hasChildren = true;
      break;
    }

    return {
      level: entry.level,
      text: entry.text,
      pos: entry.pos,
      endPos,
      bodyPreview,
      number: entry.number,
      isTitle: entry.isTitle,
      hasChildren,
    };
  });

  cache.set(docObj, entries);
  return entries;
}

// ---------------------------------------------------------------------------
// Counter helpers
// ---------------------------------------------------------------------------

/**
 * Increment the counter for the given heading level and reset all deeper depth counters.
 *
 * Uses `LEVEL_TO_DEPTH` to map the heading level to a 0-indexed counter slot.
 * H2 and H3 both map to depth 2 (slot 1), so they share and advance the same counter.
 * H4 and H5 both map to depth 3 (slot 2). H6 maps to depth 4 (slot 3).
 */
function incrementCounters(counters: number[], level: number): void {
  const depth = LEVEL_TO_DEPTH[level];
  /* v8 ignore next */
  if (depth === undefined) return;
  const idx = depth - 1;
  /* v8 ignore next */
  if (idx < 0 || idx >= counters.length) return;

  const current = counters[idx];
  if (current !== undefined) {
    counters[idx] = current + 1;
  }

  // Reset all deeper depth counters
  for (let i = idx + 1; i < counters.length; i++) {
    counters[i] = 0;
  }
}

/**
 * Build the dotted number string for a heading at the given level (1-6).
 *
 * Iterates over the depth slots 0..depth-1 and joins them with dots.
 * For H1 (depth 1), returns just the number string without any trailing dot.
 *
 * Examples:
 * - H1 with counters=[1,0,0,0] → "1"
 * - H2 with counters=[1,2,0,0] → "1.2"
 * - H4 with counters=[1,2,3,0] → "1.2.3"
 * - H6 with counters=[1,2,3,4] → "1.2.3.4"
 */
function buildNumber(counters: number[], level: number): string {
  const depth = LEVEL_TO_DEPTH[level];
  /* v8 ignore next */
  if (depth === undefined) return '';

  const parts: string[] = [];
  for (let i = 0; i < depth; i++) {
    const val = counters[i];
    /* v8 ignore next */
    parts.push(String(val ?? 0));
  }

  // depth 1 (H1): return just the number, no trailing dot
  if (depth === 1) {
    /* v8 ignore next */
    return parts[0] ?? '0';
  }

  // Multi-depth: join all parts with dots
  return parts.join('.');
}
